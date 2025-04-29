const express = require('express');
const scheduleRouter = require('./api/schedule');

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Mount the /api routes
app.use('/api', scheduleRouter);

// Default root route
app.get('/', (req, res) => {
  res.send('Cronthehook API is running');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 