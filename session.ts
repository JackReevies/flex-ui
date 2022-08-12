import { readFileSync, rmSync, writeFileSync } from "fs"
import { readdir } from "fs/promises"
import { sep } from "path"
import { addNewScrubbed, addToInMemoryConfig, sheets, upsertNewCaseEvent } from "app/et/configs"
import { COMPOUND_KEYS } from "app/constants"
import { upsertFields } from "app/helpers"
import { Answers, ConfigSheets, Session } from "types/types"

export const SESSION_DIR = 'sessions'
export const SESSION_EXT = '.session.json'

export const session: Session = createNewSession(`session_${Math.floor(Date.now() / 1000)}`)
saveSession(session)

/**
 * Save session to the sessions folder
 */
export function saveSession(session: Session) {
  writeFileSync(`${SESSION_DIR}${sep}${session.name}${SESSION_EXT}`, JSON.stringify(session, null, 2))
}

/**
 * Creates a new session and sets singleton
 * @param name Name for the session (don't include the extension)
 * @returns the new session
 */
export function createAndLoadNewSession(name: string) {
  const newSession = createNewSession(name)

  for (const key in newSession) {
    session[key] = newSession[key]
  }

  saveSession(session)
  return session
}

/**
 * Reads specific session file from file and loads it into the singleton. Loads contents into in-memory configs
 * @param sessionFileName Name of the session on disk (must include the extension)
 */
export function restorePreviousSession(sessionFileName: string) {
  const read = readFileSync(`${SESSION_DIR}${sep}${sessionFileName}`)
  const json: Session = JSON.parse(read.toString())

  for (const sheet of sheets) {
    //@ts-ignore - TODO: Please fix this - the types should match
    session.added[sheet] = json.added[sheet] || []
  }

  session.date = json.date
  session.name = json.name

  addToInMemoryConfig(session.added)

  addNewScrubbed(session.added.Scrubbed)

  for (const event of session.added.CaseEvent) {
    upsertNewCaseEvent(event)
  }

  if (!json.lastAnswers) return

  for (const key in json.lastAnswers) {
    session.lastAnswers[key as keyof (Answers)] = json.lastAnswers[key as keyof (Answers)]
  }
}

/**
 * Finds all saved session files in the session folder
 * @returns array of session file names
 */
export async function findPreviousSessions() {
  const files = await readdir(SESSION_DIR, { withFileTypes: true })
  return files.filter(o => o.name.endsWith(SESSION_EXT)).map(o => o.name)
}

/**
 * Upserts objects into the current session
 * @param fields object containing supported ccd config fields
 */
export function addToSession(fields: Partial<ConfigSheets>) {
  for (const sheet of sheets) {
    if (fields[sheet]?.length) {
      //@ts-ignore - TODO: Please fix this, not sure why the types don't align here
      upsertFields(session.added[sheet], fields[sheet], COMPOUND_KEYS[sheet])
    }
  }

}

/**
 * Gets the count of CaseFields in the current session
 */
export function getFieldCount() {
  return session.added.CaseField.length
}

/**
 * Gets a record of Fields by Page
 */
export function getFieldsPerPage(): Record<number, number> {
  return session.added.CaseEventToFields.reduce((acc: any, obj) => {
    if (!acc[obj.PageID]) {
      acc[obj.PageID] = 0
    }
    acc[obj.PageID]++
    return acc
  }, {})
}

/**
 * Gets a count of pages in the current session
 */
export function getPageCount() {
  return Object.keys(getFieldsPerPage())
}

/**
 * Adds to the lastAnswers object for this session
 */
export function addToLastAnswers(answers: any) {
  session.lastAnswers = {
    ...session.lastAnswers,
    ...answers
  }
}

/**
 * Creates a new blank object for a session
 */
export function createNewSession(name: string): Session {
  return {
    name,
    date: new Date(),
    lastAnswers: {},
    added: {
      AuthorisationCaseField: [],
      CaseEventToFields: [],
      CaseField: [],
      Scrubbed: [],
      CaseEvent: [],
      AuthorisationCaseEvent: [],
      EventToComplexTypes: [],
    }
  }
}

/** Deletes empty previous sessions */
export async function cleanupEmptySessions() {
  const previous = await findPreviousSessions()

  for (const prev of previous) {
    const filename = `${SESSION_DIR}${sep}${prev}`
    const loaded: Session = JSON.parse(readFileSync(filename, 'utf-8'))

    if (loaded.name === session.name) continue

    // if any array inside session.added is not empty - don't delete
    if (Object.values(loaded.added).some(o => o.length)) {
      continue
    }

    rmSync(filename)
  }
}