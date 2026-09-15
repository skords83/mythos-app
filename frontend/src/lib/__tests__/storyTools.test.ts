import { discoverNames, manuscriptText, occurrences, parseAliases, mentionLabels } from '../storyTools'

describe('Story Explorer manuscript indexing', () => {
  it('reads persisted HTML wrappers, JSON trees and mention labels', () => {
    expect(manuscriptText({ content: '<p>Aginolf geht.</p>' })).toBe('Aginolf geht.')
    expect(manuscriptText({ content: [{text:'Hallo'}, {attrs:{label:'Matti'}}] })).toBe('Hallo Matti')
    expect(manuscriptText('<p>Fabian &amp; Matti</p>')).toBe('Fabian & Matti')
  })
  it('matches aliases without duplicate overlaps or substrings, including Unicode', () => {
    expect(occurrences('Fabian Müller, Fabian, Änne und Ännes Haus. der Junge.', ['Fabian','Fabian Müller','Änne','der Junge']).map(m=>m.text)).toEqual(['Fabian Müller','Fabian','Änne','der Junge'])
    expect(occurrences('a+b aab', ['a+b'])).toHaveLength(1)
  })
  it('offers repeated unknown names and excludes known aliases and common words', () => {
    expect(discoverNames(['Matti Matti Matti Aber Aber Aber Fabian Fabian Fabian'], ['Fabian'])).toEqual([{name:'Matti',count:3}])
  })
  it('validates and deduplicates aliases', () => {
    expect(parseAliases([' Matti ','Matti'])).toEqual(['Matti'])
    expect(parseAliases([3])).toBeNull()
    expect(parseAliases([''])).toBeNull()
    expect(parseAliases(undefined)).toBeUndefined()
  })
})

it('retains mention identity after renaming an entity', () => {
  expect(mentionLabels({content:'<p><span data-character-id="c1">@Alter Name</span></p>'})).toEqual({'CHARACTER:c1':['Alter Name']})
})
