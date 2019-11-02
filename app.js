const express = require('express')
var bodyParser  = require("body-parser");
let fetch = require('node-fetch');
const { Client } = require('pg');


const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
});

client.connect();



app.post('/ip/add',async function(request, response){
    let ip = request.body.ip;
    ip =  ip.trim()  //remove extra newline char

    let location = await getLocation(ip);
    console.log("ip: " , ip);
    console.log("location: ", location);
    if (location.latitude && location.longitude){
        let dbRes = await saveToDb(ip, location.latitude, location.longitude);
        response.status = 304;

    } else {
        response.status = 404;
        console.log("location info null for ip: ", ip);
    }
    return response

});

app.get('/ip/all', async function (request, response) {
    let allIpInfo = await getAllData();
    console.log("all ip info: ", allIpInfo)
    response.body = allIpInfo;
    response.status = 200;
})

app.listen(process.env.PORT || 5000, () =>{})

async function getLocation(ip) {
    let search = "http://api.ipstack.com/" + ip
        + "?access_key=" + "938aa5bb84712b5de3034380f0b490d6"
        + "&fields=latitude,longitude";
    console.log(search);
    try {
        const response = await fetch(search, {
            method: 'GET',
            headers: {'Content-Type': 'application/json'}
        });
        const data = await response.json();
        return {latitude: data.latitude, longitude: data.longitude}
    } catch(err) {
        console.log("error fetching location", err)
        return null
    }

}

const text = 'INSERT INTO IP_INFO(ADDRESS, LATITUDE, LONGITUDE) VALUES($1, $2, $3) RETURNING *';
async function saveToDb(ip, latitude, longitude) {
    const values = [ip, latitude, longitude]
    try {
        const res = await client.query(text, values)
        console.log(res.rows[0])
        return res.rows[0];
    } catch (err) {
        console.log("error saving to db", err.stack)
        return null;
    }
}

async function getAllData() {
    try {
        const qry = 'SELECT * FROM IP_INFO';
        const res = await client.query(qry)
        console.log(res.rows)
        return res.rows;
    } catch (err) {
        console.log("error querying to db", err.stack)
        return null;
    }
}
