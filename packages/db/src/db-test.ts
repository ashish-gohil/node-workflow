import mongoose from "mongoose";

async function test() {
    console.log("db conneection star")
    await mongoose.connect("mongodb+srv://ashishgohil148:%40shisH1410@cluster0.dh2bm.mongodb.net/n8n_db?retryWrites=true&w=majority");
    console.log("Connected!");
}

test();
