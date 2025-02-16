const express = require('express');
const app = express();
const http = require('http')
const path = require('path')
const port = 4000;

app.use(express.static(path.join(__dirname)))
app.listen(port, () =>
{
    console.log(`Your app is running at http://localhost:${port}`)
})