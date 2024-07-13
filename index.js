const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
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



        //jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body

            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '3h' })
            res.send({ token })
        })


        //middlewares
        const verifyToken = (req, res, next) => {
            // console.log(req.headers.authorization)

            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'forbidden access' })
            }

            const token = req.headers.authorization.split(' ')[1]

            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'forbidden access' })
                }
                req.decoded = decoded
                next()
            })


            // next()
        }

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



        app.get('/wishlist/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await wishlistCollection.find(query).toArray()
            res.send(result)
        })

        app.put('/wishlist', async (req, res) => {
            const wishlistInfo = req.body
            const email = req.body.email
            const id = req.body.productId

            const query = { email: email, productId: id }

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

        app.delete('/wishlist/:email/:id', async (req, res) => {
            const email = req.params.email;
            const id = req.params.id;
            const query = {
                email: email,
                productId: id
            }

            const result = await wishlistCollection.deleteOne(query)
            res.send(result)

        })


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
        app.get('/users', verifyToken, async (req, res) => {
            // console.log(req.headers)
            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        app.get('/user/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await usersCollection.findOne(query)
            res.send(result)
        })
        app.post('/users', async (req, res) => {
            const userInfo = req.body


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

        app.patch('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const role = req.body.role
            const filter = { email: email }

            const updateDoc = {
                $set: {
                    role: role
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        app.delete('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const result = await usersCollection.deleteOne(query)
            res.send(result)
        })


        //order related api
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