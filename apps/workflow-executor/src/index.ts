import { Context, SQSEvent } from 'aws-lambda';
import { connectMongo, WorkflowModel } from '@repo/db';


export const handler = async (event: SQSEvent, context: Context) => {
    console.log("-------event-------")
    console.log(event)
    console.log("-------event-------")
    console.log("-----context--------")
    console.log(context)
    console.log("-----context--------")

    const workflowIdsToBeExecuted = event.Records.map(record => JSON.parse(record.body).workflowId);
    console.log("-------workflowIdsToBeExecuted-------");
    console.log(workflowIdsToBeExecuted);
    console.log("-------workflowIdsToBeExecuted-------");
    if (workflowIdsToBeExecuted.length > 0) {
        connectMongo();

        const wfs = await WorkflowModel.find({ workflowId: { $in: workflowIdsToBeExecuted } });
        console.log("-----wfs from db------")
        console.log(wfs)
        console.log("-----wfs from db------")

    }


    return {
        success: true
    };
};
