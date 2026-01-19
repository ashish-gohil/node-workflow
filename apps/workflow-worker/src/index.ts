export const handler = async (event) => {
    for (const record of event.Records) {
        const payload = JSON.parse(record.body);
        // execute node
    }
};
