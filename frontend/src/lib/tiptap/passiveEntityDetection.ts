import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'

// C8: passive entity detection. Unlike CharacterMention/EntityMention (lib/tiptap/
// characterMentionExtension.ts, entityMentionExtension.ts) which own the live '@'
// Suggestion plugin, this is a plain decoration plugin — no Suggestion instance,
// so it can't collide with the project's "one Suggestion plugin" constraint. It
// scans plain text for names that match known Character/Place/Item entities and
// offers an inline confirm (click the underlined text) / dismiss (click the '×')
// affordance, converting a confirmed match into the same mention nodes the '@'
// picker inserts.
export type PassiveDetectableKind = 'CHARACTER' | 'PLACE' | 'ITEM'

export interface PassiveEntityCandidate {
  id: string
  name: string
  kind: PassiveDetectableKind
}

export interface PassiveDetectionDataRef {
  current: { candidates: PassiveEntityCandidate[] }
}

const MIN_NAME_LENGTH = 3
// Caps the per-scan decoration count so a long chapter with many entities can't
// turn every keystroke into an expensive full-document regex sweep.
const MAX_DECORATIONS = 40

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface PassiveMatch {
  from: number
  to: number
  candidate: PassiveEntityCandidate
}

function findMatches(
  doc: ProseMirrorNode,
  candidates: PassiveEntityCandidate[],
  dismissed: Set<string>
): PassiveMatch[] {
  const usable = candidates.filter(
    (c) => c.name.trim().length >= MIN_NAME_LENGTH && !dismissed.has(`${c.kind}:${c.id}`)
  )
  if (usable.length === 0) return []

  const matches: PassiveMatch[] = []
  doc.descendants((node, pos) => {
    if (matches.length >= MAX_DECORATIONS) return false
    // Mention nodes are atoms with no text children, so plain descendants()
    // traversal never walks into already-linked text — nothing to exclude explicitly.
    if (!node.isText || !node.text) return
    const text = node.text
    for (const candidate of usable) {
      if (matches.length >= MAX_DECORATIONS) break
      const re = new RegExp(`\\b${escapeRegExp(candidate.name)}\\b`, 'i')
      const match = re.exec(text)
      if (match) {
        const from = pos + match.index
        matches.push({ from, to: from + match[0].length, candidate })
      }
    }
  })
  return matches
}

function buildDecorations(
  doc: ProseMirrorNode,
  candidates: PassiveEntityCandidate[],
  dismissed: Set<string>
): DecorationSet {
  const matches = findMatches(doc, candidates, dismissed)
  const decorations = matches.flatMap((m) => [
    Decoration.inline(m.from, m.to, {
      class: 'border-b border-dotted border-zinc-400 dark:border-zinc-600 cursor-pointer',
      'data-passive-id': m.candidate.id,
      'data-passive-kind': m.candidate.kind,
      title: `${m.candidate.name}: klicken zum Verknüpfen`,
    }),
    Decoration.widget(
      m.to,
      () => {
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.textContent = '×'
        btn.title = 'Vorschlag ignorieren'
        btn.className = 'text-[10px] leading-none text-zinc-400 hover:text-red-500 align-super ml-0.5 cursor-pointer'
        btn.setAttribute('data-passive-dismiss-id', m.candidate.id)
        btn.setAttribute('data-passive-dismiss-kind', m.candidate.kind)
        return btn
      },
      { side: 1 }
    ),
  ])
  return DecorationSet.create(doc, decorations)
}

interface PassiveDetectionState {
  decorations: DecorationSet
  dismissed: Set<string>
}

export const passiveEntityDetectionKey = new PluginKey<PassiveDetectionState>('passiveEntityDetection')

export interface PassiveEntityDetectionOptions {
  dataRef: PassiveDetectionDataRef
}

export const PassiveEntityDetection = Extension.create<PassiveEntityDetectionOptions>({
  name: 'passiveEntityDetection',

  addOptions() {
    return {
      dataRef: { current: { candidates: [] } },
    }
  },

  addProseMirrorPlugins() {
    const { dataRef } = this.options

    return [
      new Plugin<PassiveDetectionState>({
        key: passiveEntityDetectionKey,
        state: {
          init: (_config, state) => ({
            decorations: buildDecorations(state.doc, dataRef.current.candidates, new Set()),
            dismissed: new Set<string>(),
          }),
          apply: (tr, value, _oldState, newState) => {
            const meta = tr.getMeta(passiveEntityDetectionKey) as { dismiss?: string; rescan?: boolean } | undefined
            let dismissed = value.dismissed
            if (meta?.dismiss) {
              dismissed = new Set(dismissed)
              dismissed.add(meta.dismiss)
            }
            if (tr.docChanged || meta) {
              return { decorations: buildDecorations(newState.doc, dataRef.current.candidates, dismissed), dismissed }
            }
            return { decorations: value.decorations.map(tr.mapping, tr.doc), dismissed }
          },
        },
        props: {
          decorations(state) {
            return passiveEntityDetectionKey.getState(state)?.decorations
          },
          handleClick(view, _pos, event) {
            const target = event.target as HTMLElement | null
            if (!target) return false

            const dismissId = target.getAttribute?.('data-passive-dismiss-id')
            const dismissKind = target.getAttribute?.('data-passive-dismiss-kind')
            if (dismissId && dismissKind) {
              view.dispatch(view.state.tr.setMeta(passiveEntityDetectionKey, { dismiss: `${dismissKind}:${dismissId}` }))
              return true
            }

            const candidateId = target.getAttribute?.('data-passive-id')
            const candidateKind = target.getAttribute?.('data-passive-kind') as PassiveDetectableKind | null
            if (candidateId && candidateKind) {
              const candidate = dataRef.current.candidates.find((c) => c.id === candidateId && c.kind === candidateKind)
              if (candidate) {
                const from = view.posAtDOM(target, 0)
                const to = from + (target.textContent?.length || 0)
                const { schema } = view.state
                const node =
                  candidate.kind === 'CHARACTER'
                    ? schema.nodes.characterMention.create({ characterId: candidate.id, label: candidate.name })
                    : schema.nodes.entityMention.create({ kind: candidate.kind, entityId: candidate.id, label: candidate.name })
                view.dispatch(view.state.tr.replaceWith(from, to, node))
                return true
              }
            }
            return false
          },
        },
      }),
    ]
  },
})
