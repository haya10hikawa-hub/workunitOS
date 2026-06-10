import { spawn } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { buildExecutionTask, buildVoicePrompt, shouldInterrupt } from "./engine.mts";
import { mockEvents } from "./mockEvents.mts";

async function speak(text: string): Promise<void> {
  const child = spawn("say", [text], { stdio: "ignore" });
  const exitCode = await new Promise<number>((resolve) => {
    child.once("error", () => resolve(127));
    child.once("close", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) console.warn(`[voice-fallback] ${text}`);
}

async function main(): Promise<void> {
  const threshold = Number(process.env.ROI_THRESHOLD ?? 50);
  const rl = createInterface({ input, output });
  for (const event of mockEvents) {
    if (!shouldInterrupt(event, threshold)) continue;
    const prompt = buildVoicePrompt(event);
    await speak(prompt);
    const answer = await rl.question(`${prompt} [y/N] `);
    if (/^(y|yes|はい)$/i.test(answer.trim())) console.log(buildExecutionTask(event));
  }
  rl.close();
}

await main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
