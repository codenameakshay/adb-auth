import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export async function exec(
  file: string,
  args: string[] = [],
  timeoutMs = 10000
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(file, args, {
    windowsHide: true,
    timeout: timeoutMs,
    env: process.env,
  })
}

export async function execWithShell(
  command: string,
  timeoutMs = 10000
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = require('node:child_process').exec(command, {
      windowsHide: true,
      timeout: timeoutMs,
      env: process.env,
    }, (error: Error | null, stdout: string, stderr: string) => {
      if (error) reject(error)
      else resolve({ stdout, stderr })
    })
    child
  })
}
