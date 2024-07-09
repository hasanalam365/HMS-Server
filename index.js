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
        const cartsCollection = client.db('ShopDB').collection('carts');


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
                    email: email,

                },
                $addToSet: {
                    mywishList: req.body.wishlistId
                }
            }
            const result = await wishlistCollection.updateOne(filter, updateDoc, options)
            res.send(result)

        })

        // //selected wishlist api
        app.get('/wishlist/:email', async (req, res) => {
            const email = req.params.email;
            const wishlistQuery = { email: email }

            const wishlistResult = await wishlistCollection.findOne(wishlistQuery)

            if (!wishlistResult) {
                res.status(404).send({ message: 'Wishlist not found' })
            }

            const wishlistIds = wishlistResult.mywishList.map(id => new ObjectId(id))
            const dataQuery = { _id: { $in: wishlistIds } }

            const dataResults = await productCollection.find(dataQuery).toArray()
            res.send(dataResults)


        })


        //add to cart
        app.get('/addToCart/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await cartsCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/addToCart', async (req, res) => {
            const cartInfo = req.body

            const result = await cartsCollection.insertOne(cartInfo)
            res.send(result)
        })

        // app.put('/addToCart', async (req, res) => {
        //     const email = req.body.email
        //     const filter = { email: email }
        //     const options = { upsert: true }
        //     const updateDoc = {
        //         $set: {
        //             email: email,

        //         },
        //         $addToSet: {
        //             addtoCart: req.body.addCartId
        //         }
        //     }
        //     const result = await cartsCollection.updateOne(filter, updateDoc, options)
        //     res.send(result)

        // })

        // app.get('/addToCart/:email', async (req, res) => {
        //     const email = req.params.email;
        //     const cartQuery = { email: email }

        //     const cartResult = await cartsCollection.findOne(cartQuery)

        //     if (!cartResult) {
        //         res.status(404).send({ message: 'cartlist not found' })
        //     }

        //     console.log(cartResult?.addtoCart?.map(id => console.log('id:', id)))
        //     const cartId = cartResult?.addtoCart?.map(id => new ObjectId(id))
        //     const dataQuery = { _id: { $in: cartId } }

        //     const dataResults = await productCollection.find(dataQuery).toArray()
        //     res.send(dataResults)


        // })


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