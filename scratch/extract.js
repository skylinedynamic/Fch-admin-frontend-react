const fs = require('fs');
const readline = require('readline');

async function extract() {
    const fileStream = fs.createReadStream('C:\\Users\\MY ACCOUNT\\.gemini\\antigravity-ide\\brain\\fcfe003a-abb7-4f9d-b559-d11dc9141223\\.system_generated\\logs\\transcript_full.jsonl');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lastWriteContent = null;
    let lastStep = null;

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const data = JSON.parse(line);
            // Search for tool_calls editing PlanFee.tsx
            if (data.tool_calls) {
                for (const call of data.tool_calls) {
                    if (call.name === 'write_to_file' || call.name === 'replace_file_content' || call.name === 'multi_replace_file_content') {
                        const args = call.args || {};
                        const file = args.TargetFile || args.TargetContent || '';
                        if (file.includes('PlanFee.tsx')) {
                            lastWriteContent = {
                                type: call.name,
                                args: args,
                                step_index: data.step_index
                            };
                        }
                    }
                }
            }
            // Or view_file content of PlanFee.tsx
            if (data.type === 'VIEW_FILE' && data.content && data.content.includes('PlanFee.tsx')) {
                lastWriteContent = {
                    type: 'VIEW_FILE',
                    content: data.content,
                    step_index: data.step_index
                };
            }
        } catch (e) {
            // ignore JSON parse errors
        }
    }

    console.log(JSON.stringify(lastWriteContent, null, 2));
}

extract();
