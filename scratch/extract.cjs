const fs = require('fs');
const readline = require('readline');

async function extract() {
    const fileStream = fs.createReadStream('C:\\Users\\MY ACCOUNT\\.gemini\\antigravity-ide\\brain\\fcfe003a-abb7-4f9d-b559-d11dc9141223\\.system_generated\\logs\\transcript_full.jsonl');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const outputStream = fs.createWriteStream('scratch/extracted_history.txt');

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const data = JSON.parse(line);
            if (data.tool_calls) {
                for (const call of data.tool_calls) {
                    if (call.name === 'write_to_file' || call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
                        const args = call.args || {};
                        const file = args.TargetFile || '';
                        if (file.includes('PlanFee.tsx')) {
                            outputStream.write(`\n\n=== STEP ${data.step_index} (${call.name}) ===\n`);
                            if (call.name === 'write_to_file') {
                                outputStream.write(`Type: write_to_file\nContent:\n${args.CodeContent}\n`);
                            } else if (call.name === 'replace_file_content') {
                                outputStream.write(`Type: replace_file_content\nTarget:\n${args.TargetContent}\nReplacement:\n${args.ReplacementContent}\n`);
                            } else if (call.name === 'multi_replace_file_content') {
                                outputStream.write(`Type: multi_replace_file_content\n`);
                                (args.ReplacementChunks || []).forEach((c, idx) => {
                                    outputStream.write(`Chunk ${idx}:\nTarget:\n${c.TargetContent}\nReplacement:\n${c.ReplacementContent}\n`);
                                });
                            }
                        }
                    }
                }
            }
        } catch (e) {
            // ignore
        }
    }
    outputStream.end();
    console.log("Done writing scratch/extracted_history.txt");
}

extract();
