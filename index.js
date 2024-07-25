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
                return res.status(401).send({ message: 'unauthorized access' })
            }

            const token = req.headers.authorization.split(' ')[1]

            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded
                next()
            })


            // next()
        }

        //use verify admin after verify admin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query)

            const isAdmin = user?.role === 'admin'

            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            next()
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


        // all users  api
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            // console.log(req.headers)
            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        //profile show api
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await usersCollection.findOne(query)
            res.send(result)
        })


        //admin check
        app.get('/user/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let admin = false
            if (user) {
                admin = user?.role === 'admin'
            }

            res.send({ admin })
        })

        app.post('/users', async (req, res) => {
            const userInfo = req.body

            const user = await usersCollection.findOne({ email: userInfo.email })

            if (user && user.email === userInfo.email) {
                return res.send({ message: 'already exixts user' })
            }

            const result = await usersCollection.insertOne(userInfo)
            res.send(result)
        })

        app.post('/newUser', async (req, res) => {
            const userInfo = req.body;

            const result = await usersCollection.insertOne(userInfo)
            res.send(result)

        })

        //updated profile
        app.put('/users-updated/:email', async (req, res) => {
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

        //change user role
        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;

            const role = req.body.role
            const filter = { _id: new ObjectId(id) }

            const updateDoc = {
                $set: {
                    role: role
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result)
        })

        //delete a user
        app.delete('/users/:email', verifyToken, verifyAdmin, async (req, res) => {
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

        //order related api
        app.get('/all-orders', verifyToken, verifyAdmin, async (req, res) => {
            const result = await ordersCollection.find().toArray()
            res.send(result)
        })

        //delete order from admin
        app.delete('/order-delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }

            const result = await ordersCollection.deleteOne(query)
            res.send(result)
        })

        app.get('/view-order/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await ordersCollection.findOne(query)
            res.send(result)
        })

        // app.delete('/view-order-delete/:orderId/:id', async (req, res) => {
        //     const orderId = req.params.orderId;
        //     const productId = req.params.id;

        //     try {
        //         // Find the order by orderId
        //         const query = { orderId: orderId };
        //         const orderData = await ordersCollection.findOne(query);

        //         if (!orderData) {
        //             return res.status(404).json({ message: 'Order not found' });
        //         }

        //         // Filter out the product with the given productId
        //         const updatedProducts = orderData.allProducts.filter(product => product._id !== productId);

        //         // Update the order with the new list of products
        //         const updateResult = await ordersCollection.updateOne(
        //             query,
        //             { $set: { allProducts: updatedProducts } }
        //         );

        //         res.send(updateResult)
        //     } catch (error) {
        //         console.error(error);
        //         res.status(500).json({ message: 'An error occurred' });
        //     }
        // });

        app.delete('/view-order-delete/:orderId/:index', async (req, res) => {
            const orderId = req.params.orderId;
            const index = parseInt(req.params.index);

            try {
                // Find the order by orderId
                const query = { orderId: orderId };
                const orderData = await ordersCollection.findOne(query);

                if (!orderData) {
                    return res.status(404).json({ message: 'Order not found' });
                }

                // Check if the index is within the bounds of the allProducts array
                if (index < 0 || index >= orderData.allProducts.length) {
                    return res.status(400).json({ message: 'Invalid index' });
                }

                // Remove the product at the specified index
                const updatedProducts = [
                    ...orderData.allProducts.slice(0, index),
                    ...orderData.allProducts.slice(index + 1)
                ];

                // Update the order with the new list of products
                const updateResult = await ordersCollection.updateOne(
                    query,
                    { $set: { allProducts: updatedProducts } }
                );

                res.send(updateResult);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'An error occurred' });
            }
        });

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