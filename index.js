const express = require('express')
const cors = require('cors')
// const jwt = require('jsonwebtoken')
// const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const axios = require('axios');
require('dotenv').config();
const app = express()

const port = process.env.PORT || 5000;



app.use(express.json())
app.use(cors())




// const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.ruz3wge.mongodb.net/hmsshop`;

// console.log(process.env.MONGO_USER, process.env.MONGO_PASS)


const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.qvnsypp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const productCollection = client.db('ShopDB').collection('products');
        const usersCollection = client.db('ShopDB').collection('users');
        const wishlistCollection = client.db('ShopDB').collection('wishlist');


        //products api
        app.get('/products', async (req, res) => {
            const result = await productCollection.find().toArray()
            res.send(result)
        })

        //product details
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.findOne(query)
            res.send(result)
        })

        //all wishlist apis
        app.put('/wishlist', async (req, res) => {


            const email = req.body.email
            const filter = { email: email }
            const options = { upsert: true }


            const updateDoc = {
                $set: {
                    email: email
                },
                $addToSet: {
                    mywishList: req.body.wishlistId
                }
            }
            const result = await wishlistCollection.updateOne(filter, updateDoc, options)
            res.send(result)

        })

        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', async (req, res) => {
    res.send('HMS Server Is Running')
})

app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})