// filename: seedMongo.js

import { MongoClient } from "mongodb";

// Replace with your actual MongoDB Atlas connection string
const uri = "mongodb+srv://ngonzalezimportant_db_user:rcpf1dPlPDeDxhRn@astroquizzer.roctnxk.mongodb.net/?retryWrites=true&w=majority&appName=AstroQuizzer";

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB Atlas!");

    const db = client.db("astroquizzer");
    const usersCollection = db.collection("users");

    // Sample data
    const sampleUsers = [
      {
        username: "stargazer01",
        email: "stargazer01@example.com",
        level: 5,
        quizzesTaken: 12,
        totalScore: 850,
        favoriteSign: "Leo"
      },
      {
        username: "cosmic_queen",
        email: "cosmicqueen@example.com",
        level: 3,
        quizzesTaken: 7,
        totalScore: 420,
        favoriteSign: "Sagittarius"
      },
      {
        username: "astro_novice",
        email: "astro_novice@example.com",
        level: 1,
        quizzesTaken: 2,
        totalScore: 90,
        favoriteSign: "Taurus"
      },
      {
        username: "planet_hopper",
        email: "planethopper@example.com",
        level: 4,
        quizzesTaken: 10,
        totalScore: 680,
        favoriteSign: "Gemini"
      },
      {
        username: "lunar_lover",
        email: "lunarlover@example.com",
        level: 2,
        quizzesTaken: 5,
        totalScore: 310,
        favoriteSign: "Cancer"
      }
    ];

    const result = await usersCollection.insertMany(sampleUsers);
    console.log(`Inserted ${result.insertedCount} sample users.`);
  } catch (err) {
    console.error(err);
  } finally {
    await client.close();
    console.log("Connection closed.");
  }
}

run();
