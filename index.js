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
        const ordersCollection = client.db('ShopDB').collection('orders');



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

        // all wishlist apis
        // app.put('/wishlist', async (req, res) => {
        //     const email = req.body.email
        //     const filter = { email: email }
        //     const options = { upsert: true }
        //     const updateDoc = {
        //         $set: {
        //             email: email,

        //         },
        //         $addToSet: {
        //             mywishList: req.body.wishlistId
        //         }
        //     }
        //     const result = await wishlistCollection.updateOne(filter, updateDoc, options)
        //     res.send(result)

        // })

        app.put('/wishlist', async (req, res) => {
            const wishlistInfo = req.body
            const email = req.body.email
            const id = req.body.productId

            const query = { email: email, productId: id }

            // const queryResult=await wishlistCollection.find().toArray()
            // const checkId=queryResult.map(product=>product.productId)
            // const checkEmail=queryResult.map(product=>product.productId)

            //             if (query) {
            //                 return res.send({ message: 'this product already wishlist added' })
            //             }

            const options = { upsert: true }
            const updateDoc = {
                $set: {
                    email: email,
                    productId: id,
                    product: wishlistInfo.product
                }
            }
            const result = await wishlistCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })

        // app.delete('/wishlist/:email/:id', async (req, res) => {
        //     const email = req.params.email;
        //     const id = req.params.id;
        //     const query = {
        //         email: email,
        //         productId: new ObjectId(id)
        //     }

        //     const result = await wishlistCollection.deleteOne(query)
        //     res.send(result)

        // })
        // selected wishlist api
        // app.get('/wishlist/:email', async (req, res) => {
        //     const email = req.params.email;
        //     const wishlistQuery = { email: email }

        //     const wishlistResult = await wishlistCollection.findOne(wishlistQuery)

        //     if (!wishlistResult) {
        //         res.status(404).send({ message: 'Wishlist not found' })
        //     }

        //     const wishlistIds = wishlistResult.mywishList.map(id => new ObjectId(id))
        //     const dataQuery = { _id: { $in: wishlistIds } }

        //     const dataResults = await productCollection.find(dataQuery).toArray()
        //     res.send(dataResults)


        // })

        // delete mywishList item api
        // app.delete('/wishlist/:email/:wishlistIds', async (req, res) => {
        //     const email = req.params.email;
        //     const wishlistIds = req.params.wishlistIds
        //     const query = { email: email }


        //     const update = {
        //         $pull: {
        //             mywishList: wishlistIds
        //         }
        //     }

        //     const result = await wishlistCollection.updateOne(query, update)
        //     res.send(result)
        // })


        // get user cart api
        app.get('/addToCart/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await cartsCollection.find(query).toArray()
            res.send(result)
        })

        // add to cart user item
        app.post('/addToCart', async (req, res) => {
            const cartInfo = req.body

            const result = await cartsCollection.insertOne(cartInfo)
            res.send(result)
        })

        // user cart item delete
        app.delete('/addToCart/:id', async (req, res) => {
            const id = req.params.id

            const query = { _id: new ObjectId(id) }
            const result = await cartsCollection.deleteOne(query)
            res.send(result)
        })


        // users api
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await usersCollection.findOne(query)
            res.send(result)
        })
        app.post('/users', async (req, res) => {
            const userInfo = req.body

            console.log(userInfo)
            const result = await usersCollection.insertOne(userInfo)
            res.send(result)
        })

        app.post('/newUser', async (req, res) => {
            const userInfo = req.body;
            const result = await usersCollection.insertOne(userInfo)
            res.send(result)

        })

        //updated profile
        app.put('/users/:email', async (req, res) => {
            const userInfo = req.body
            const email = req.params.email

            const query = { email: email }

            const options = { uspsert: true }

            const updateDoc = {
                $set: {
                    email: userInfo?.email,
                    displayName: userInfo?.name,
                    photoURL: userInfo?.photoURL,
                    phone: userInfo?.phone,

                    division: userInfo?.division,
                    district: userInfo?.district,
                    thana: userInfo?.thana,
                    address: userInfo?.address,



                }
            }

            const result = await usersCollection.updateOne(query, updateDoc, options)
            res.send(result)

        })

        app.post('/orders', async (req, res) => {
            const orderInfo = req.body
            const result = await ordersCollection.insertOne(orderInfo)
            res.send(result)
        })

        app.put('/orders/:orderId', async (req, res) => {
            const orderId = req.params.orderId;
            const { name, phone, secondPhone, email, division, district, thana, address, currentLocation } = req.body
            // console.log(orderId, name, phone, secondPhone, email, division, district, thana, address, currentLocation)
            const query = { orderId: orderId }
            const options = { upsert: true }

            const updateDoc = {
                $set: {
                    name,
                    phone,
                    secondPhone,
                    email,
                    division,
                    district,
                    thana,
                    address,
                    currentLocation
                }
            }

            const result = await ordersCollection.updateOne(query, updateDoc, options)
            res.send(result)

        })

        //delete my carts ofter order confirm
        app.delete('/mycarts-delete/:email', async (req, res) => {
            const email = req.params.email;
            const query = {
                email: {
                    $regex: email
                }
            }
            const result = await cartsCollection.deleteMany(query)
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