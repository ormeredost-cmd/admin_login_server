// bgmi-api/listUsers.js
const db = require("./database");

db.all("SELECT id, email FROM users", [], (err, rows) => {
  if (err) {
    console.error("Error:", err);
  } else {
    console.log("Users:", rows);
  }
  db.close();
});
