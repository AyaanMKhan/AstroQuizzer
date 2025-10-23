import React, { useEffect, useState } from "react";

const App: React.FC = () => {
  const [message, setMessage] = useState<string>(""); // To store the backend response
  const [error, setError] = useState<string | null>(null); // To store any error message

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const response = await fetch("http://localhost:5001/"); // Backend URL

        // Check if the response is not OK (status code outside 200-299)
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.text(); // Assuming the backend sends plain text
        setMessage(data); // Set the response message in state
        setError(null); // Clear any previous errors
      } catch (err: any) {
        console.error("Error fetching data:", err);
        setError("Failed to fetch data from the backend. Please try again later.");
      }
    };

    fetchMessage();
  }, []);

  return (
    <div>
      <h1>Frontend</h1>
      {error ? (
        <p style={{ color: "red" }}>{error}</p> // Display error message in red
      ) : (
        <p>{message}</p> // Display the backend message
      )}
    </div>
  );
};

export default App;