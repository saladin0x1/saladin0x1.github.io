import fs from 'node:fs';
import readline from 'node:readline';
import { CONFIG } from './config';

// --- Types ---

interface ChatMessage {
  role: 'system' | 'user' | 'model';
  content: string;
}

interface TrainingExample {
  messages: ChatMessage[];
}

// --- CLI Logic ---

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const ask = (query: string): Promise<string> => 
  new Promise((resolve) => rl.question(`\x1b[36m${query}\x1b[0m`, resolve));

function getExistingCount(): number {
  if (!fs.existsSync(CONFIG.OUTPUT_FILE)) return 0;
  const content = fs.readFileSync(CONFIG.OUTPUT_FILE, 'utf-8');
  return content.split('\n').filter(line => line.trim().length > 0).length;
}

async function main() {
  console.clear();
  console.log('\x1b[1m\x1b[32mGEMINI FINE-TUNING STUDIO\x1b[0m');
  console.log(`\x1b[90mTarget: ${CONFIG.OUTPUT_FILE}\x1b[0m`);
  console.log(`\x1b[90mCurrent Examples: ${getExistingCount()}\x1b[0m`);
  console.log('\nType \x1b[31mEXIT\x1b[0m to quit.\n');

  while (true) {
    console.log('\x1b[90m----------------------------------------\x1b[0m');
    
    const track = await ask('Track Input (e.g. "Burial - Archangel"): ');
    if (track.trim().toUpperCase() === 'EXIT') break;
    if (!track.trim()) continue;

    const reaction = await ask('Ideal Output (e.g. "Ghost in the static"): ');
    if (reaction.trim().toUpperCase() === 'EXIT') break;
    if (!reaction.trim()) continue;

    const example: TrainingExample = {
      messages: [
        { role: 'system', content: CONFIG.SYSTEM_PROMPT },
        { role: 'user', content: `Track: ${track}` },
        { role: 'model', content: reaction }
      ]
    };

    try {
      fs.appendFileSync(CONFIG.OUTPUT_FILE, JSON.stringify(example) + '\n');
      console.log(`\x1b[32mOK.\x1b[0m`);
    } catch (err) {
      console.error(`\x1b[31mError saving:\x1b[0m`, err);
    }
  }

  rl.close();
  console.log(`\n\x1b[32mSession Complete.\x1b[0m Total Dataset Size: ${getExistingCount()}`);
}

main().catch(console.error);
