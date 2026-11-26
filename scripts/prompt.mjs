import readline from "node:readline";

export function askHidden(question) {
  if (process.env.PORTFOLIO_PASSWORD) return Promise.resolve(process.env.PORTFOLIO_PASSWORD);
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(question)) rl.output.write(s); };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}
