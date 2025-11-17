# AstroQuizzer MongoDB ERD

This file contains an ERD (Mermaid) diagram for the three collections in your MongoDB database: `users`, `apods`, and `questions`.

Paste the Mermaid block below into the Mermaid Live Editor (https://mermaid.live) or open in VS Code with a Mermaid preview extension.

```mermaid
erDiagram
    USERS {
        ObjectId _id PK
        string username "unique"
        string email "unique"
        string firstName
        string lastName
        string passwordHash
        boolean verified
        number quizzesTaken
        number totalScore
        number currentDaysPoints
        boolean dailyQuizCompleted
        date createdAt
        date updatedAt
    }

    APODS {
        ObjectId _id PK
        string date "unique, indexed" 
        string title
        string url
        string explanation
        string media_type
        string[] additionalResources
        date createdAt
        date updatedAt
    }

    QUESTIONS {
        ObjectId _id PK
        string date "unique, indexed"  
        date createdAt
        date updatedAt
    }

    QUESTION_ITEM {
        string questionText
        string[] options
        number correctAnswer
        string difficulty
        number points
    }

    %% Relationships (logical)
    APODS ||--o{ QUESTIONS : "1-to-1 by date (logical)"
    QUESTIONS ||--o{ QUESTION_ITEM : "embedded array (exactly 5)"

    %% Note: USERS currently has no direct foreign-key relationships in the schema
    %% (No persisted quiz submissions collection in the codebase). Quizzes are tracked by
    %% user fields (quizzesTaken, totalScore, etc.)
```

Notes:
- `questions` documents store an embedded array (exactly 5) of question objects; I represented that embedded object as `QUESTION_ITEM` in the ERD.
- `APODS.date` and `QUESTIONS.date` are strings in your models (format YYYY-MM-DD) and act as the linkage (logical FK) between APOD and Questions.
- `USERS` currently stores metrics on the document (no submissions collection present).

How to preview
- Option A (quick): Open https://mermaid.live and paste the Mermaid block above. Click "Render". Export SVG/PNG.
- Option B (VS Code): Install "Markdown Preview Mermaid Support" or "Mermaid Markdown Syntax Highlighting" and open `docs/ERD.md`.
- Option C (draw.io/diagrams.net): Manually draw boxes and arrows using the diagram editor.

If you want I can:
- Export a PNG/SVG of this diagram and add it to the repo under `docs/`.
- Generate a PlantUML/PNG file instead.
- Create a dbdiagram.io or draw.io file and push it to the repo.

Which output do you prefer?