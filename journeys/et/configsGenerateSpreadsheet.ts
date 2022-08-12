import { execCommand } from "app/helpers"
import { prompt } from "inquirer"
import { Journey } from "types/types"

const QUESTION_ENV = "WHat environment are we generating for?"

async function journeyGenerateSpreadsheets() {
  const answers = await prompt([{ name: 'env', message: QUESTION_ENV, default: 'local' }])

  return generateSpreadsheets(answers.env)
}

export async function generateSpreadsheets(env = "local") {
  await execCommand(`yarn generate-excel-${env}`, process.env.ENGWALES_DEF_DIR)
  await execCommand(`yarn generate-excel-${env}`, process.env.SCOTLAND_DEF_DIR)
}

export default {
  group: 'et-configs',
  text: 'Generate spreadsheets',
  fn: journeyGenerateSpreadsheets
} as Journey