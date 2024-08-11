const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const app = express()

const port = process.env.PORT || 5000;

app.use(express.json())
app.use(cors({
    origin: ['http://localhost:5173', 'https://hms-shop.firebaseapp.com', 'https://hms-shop.web.app']
}))


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
        // await client.connect();

        const productCollection = client.db('ShopDB').collection('products');
        const usersCollection = client.db('ShopDB').collection('users');
        const wishlistCollection = client.db('ShopDB').collection('wishlist');
        const cartsCollection = client.db('ShopDB').collection('carts');
        const pendingOrderCollection = client.db('ShopDB').collection('pendingOrders');
        const selectedOrderCollection = client.db('ShopDB').collection('selectedOrders');
        const confirmOrderCollection = client.db('ShopDB').collection('confirmOrders');
        const orderStatusCollection = client.db('ShopDB').collection('orderStatus');

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
            const result = await productCollection.find().sort({ _id: -1 }).toArray();
            res.send(result)

        })

        app.get('/all-products', async (req, res) => {

            const { search } = req.query;
            let query = {}

            if (search) {
                query = {
                    $or: [
                        {
                            productId: new RegExp(search, 'i')
                        },
                        {
                            title: new RegExp(search, 'i')
                        },
                    ]
                };
            }
            const result = await productCollection.find(query).sort({ _id: -1 }).toArray();
            res.send(result)
        })

        //product details
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.findOne(query)
            res.send(result)
        })

        //randomly product show in product details page
        app.get('/products/category/:category', async (req, res) => {
            const category = req.params.category;
            const query = { category: category }
            const result = await productCollection.find(query).limit(10).toArray()
            res.send(result)
        })

        //wishlist related apis
        app.get('/wishlist/:email', async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await wishlistCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/wishlist/check/:id/:email', async (req, res) => {
            const id = req.params.id;
            const email = req.params.email;

            const query = { productId: id, email: email }
            const check = await wishlistCollection.findOne(query)
            if (check) {
                res.send(true)
            }
            else {
                res.send(false)
            }
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
                    product: wishlistInfo.product,
                    quantity: wishlistInfo.quantity
                }
            }
            const result = await wishlistCollection.updateOne(query, updateDoc, options)
            res.send(result)
        })


        //wishlist api
        app.delete('/wishlist/delete/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await wishlistCollection.deleteOne(query)
            res.send(result)

        })

        app.put('/whishlist/quantity-plus/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const wishlist = await wishlistCollection.findOne(query)

            if (!wishlist) {
                return res.send('wishlist not found')
            }

            try {

                const updateDoc = {
                    $set: {
                        quantity: wishlist.quantity + 1
                    }
                }

                const result = await wishlistCollection.updateOne(query, updateDoc)
                res.send(result)

            } catch (error) {
                res.send(error.message)
            }

        })



        app.put('/whishlist/quantity-minus/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const wishlist = await wishlistCollection.findOne(query)

            if (!wishlist) {
                return res.send('wishlist not found')
            }
            if (wishlist.quantity === 1) {
                return res.send('At least One item is selected')
            }
            try {

                const updateDoc = {
                    $set: {
                        quantity: wishlist.quantity - 1
                    }
                }
                const result = await wishlistCollection.updateOne(query, updateDoc)
                res.send(result)

            } catch (error) {
                res.send(error.message)
            }

        })

        //product details remove wishlist api
        app.delete('/wishlist/remove/:id/:email', async (req, res) => {
            const id = req.params.id;
            const email = req.params.email
            const query = { productId: id, email: email }
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

        //quantity check user cart
        app.get('/quantity/check/:id', async (req, res) => {
            const id = req.params.id;
            if (!id || id === 'undefined') {
                return res.status(400).send({ error: 'Product ID is undefined' });
            }

            try {
                const query = { _id: new ObjectId(id) };
                const result = await cartsCollection.findOne(query);
                if (!result) {
                    return res.status(404).send({ error: 'Product not found' });
                }
                res.send(result);
            } catch (error) {
                console.error('Error fetching product:', error);
                res.status(500).send({ error: 'Internal Server Error' });
            }
        });

        app.put('/quantity-plus/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const product = await cartsCollection.findOne(query)

            if (!product) {
                return res.send('Product not found')
            }

            try {

                const updateDoc = {
                    $set: {
                        quantity: product.quantity + 1
                    }
                }

                const result = await cartsCollection.updateOne(query, updateDoc)
                res.send(result)

            } catch (error) {
                res.send(error.message)
            }

        })
        app.put('/quantity-minus/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const product = await cartsCollection.findOne(query)

            if (!product) {
                return res.send('Product not found')
            }
            if (product.quantity === 1) {
                return res.send('At least One item is selected')
            }
            try {

                const updateDoc = {
                    $set: {
                        quantity: product.quantity - 1
                    }
                }

                const result = await cartsCollection.updateOne(query, updateDoc)
                res.send(result)

            } catch (error) {
                res.send(error.message)
            }

        })

        app.post('/addToCart', async (req, res) => {
            const cartInfo = req.body
            const query = { productId: cartInfo.productId, email: cartInfo.email }
            const checkProduct = await cartsCollection.findOne(query)
            if (checkProduct) {
                const options = { upsert: true }
                const updateDoc = {
                    $set: {
                        quantity: cartInfo.quantity + checkProduct.quantity
                    }
                }
                const resultCart = await cartsCollection.updateOne(query, updateDoc, options)
                return res.send(resultCart)
            }


            const result = await cartsCollection.insertOne(cartInfo)
            res.send(result)
        })

        // user cart item delete
        app.delete('/addToCart/:id/:email', async (req, res) => {
            const id = req.params.id
            const email = req.params.email
            const query = { _id: new ObjectId(id), email: email }
            const result = await cartsCollection.deleteOne(query)
            res.send(result)
        })

        // all users  api
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const { search } = req.query;
            let query = {}
            if (search) {
                query = { email: new RegExp(search, 'i') };
            }
            const result = await usersCollection.find(query).sort({ _id: -1 }).toArray();
            res.send(result)




        })

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
        app.put('/users-updated/:email', verifyToken, async (req, res) => {
            const userInfo = req.body
            const email = req.params.email
            const query = { email: email }
            const options = { uspsert: true }

            if (userInfo.photoURL) {
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
                return res.send(result)
            }

            const updateDoc = {
                $set: {
                    email: userInfo?.email,
                    displayName: userInfo?.name,

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
            const result = await pendingOrderCollection.insertOne(orderInfo)
            res.send(result)
        })

        app.put('/orders/:orderId', async (req, res) => {
            const orderId = req.params.orderId;
            const { name, phone, secondPhone, email, division, district, thana, address, currentLocation } = req.body

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

            const result = await pendingOrderCollection.updateOne(query, updateDoc, options)
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

        //order Status related api
        app.get('/orderStatus', async (req, res) => {
            const result = await orderStatusCollection.find().toArray()
            res.send(result)
        })

        app.get('/orderStatus/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            const result = await orderStatusCollection.find(query).toArray()
            res.send(result)
        })
        app.post('/orderStatus', async (req, res) => {
            const status = req.body
            const result = await orderStatusCollection.insertOne(status)
            res.send(result)
        })

        app.patch('/orderStatus/:orderId', async (req, res) => {
            const orderId = req.params.orderId;
            const query = { orderId: orderId }
            const updateDoc = {
                $set: {
                    status: 'confirmed'
                }
            }
            const result = await orderStatusCollection.updateOne(query, updateDoc)
            res.send(result)
        })

        //order related api
        app.get('/all-orders', verifyToken, verifyAdmin, async (req, res) => {

            const { search } = req.query;
            let query = {}
            if (search) {
                query = { orderId: new RegExp(search, 'i') };
            }
            const result = await pendingOrderCollection.find(query).sort({ _id: -1 }).toArray();
            res.send(result);
        })

        //delete order from admin
        app.delete('/order-delete/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }

            const result = await pendingOrderCollection.deleteOne(query)
            res.send(result)
        })

        app.get('/view-order/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await pendingOrderCollection.findOne(query)
            res.send(result)
        })

        app.get('/stockProductCount/:productIds', async (req, res) => {
            const ids = req.params.productIds.split(',').map(id => parseInt(id.trim()))
            const query = { productId: { $in: ids } }
            const matchingProducts = await productCollection.find(query).toArray()
            res.send(matchingProducts)

        })


        app.patch('/stockProductCount/:productId/:quantity', async (req, res) => {
            const id = parseInt(req.params.productId);
            const quantity = parseInt(req.params.quantity)
            const query = { productId: id }
            const product = await productCollection.findOne(query)

            if (product) {
                const updateDoc = {
                    $set: {
                        stock: product.stock - quantity
                    }
                }
                const result = await productCollection.updateOne(query, updateDoc)
                res.send(result)
            }
            else {
                res.send({ message: 'undefined' })
            }

        })

        //order confirm product by admin
        app.get('/selectedOrder/:orderId', async (req, res) => {
            const orderId = req.params.orderId
            const result = await selectedOrderCollection.find({ orderId }).toArray()
            res.send(result)
        })

        app.post('/selectedOrder', async (req, res) => {
            const selectedOrders = req.body
            const result = await selectedOrderCollection.insertOne(selectedOrders)
            res.send(result)
        })


        app.delete('/view-order-delete/:orderId/:index', async (req, res) => {
            const orderId = req.params.orderId;
            const index = parseInt(req.params.index);

            try {
                // Find the order by orderId
                const query = { orderId: orderId };
                const orderData = await pendingOrderCollection.findOne(query);

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
                const updateResult = await pendingOrderCollection.updateOne(
                    query,
                    { $set: { allProducts: updatedProducts } }
                );

                res.send(updateResult);
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: 'An error occurred' });
            }
        });

        //order confirm related api
        app.get('/confirmOrder', verifyToken, verifyAdmin, async (req, res) => {


            const { search } = req.query;
            let query = {}
            if (search) {
                query = { orderId: new RegExp(search, 'i') };
            }
            const result = await confirmOrderCollection.find(query).sort({ _id: -1 }).toArray();
            res.send(result);

        })

        app.get('/details-confirm-order/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await confirmOrderCollection.findOne(query)
            res.send(result)
        })

        app.post('/confirmOrder', verifyToken, verifyAdmin, async (req, res) => {
            const orderAllDetails = req.body
            const result = await confirmOrderCollection.insertOne(orderAllDetails)
            res.send(result)
        })

        app.delete('/confirmOrder/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await confirmOrderCollection.deleteOne(query)
            res.send(result)
        })

        //delete pending orders collection
        app.delete('/pendingOrders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await pendingOrderCollection.deleteOne(query)
            res.send(result)
        })

        //deleted selected collection products
        app.delete('/selectedOrders/:orderId', async (req, res) => {
            const orderId = req.params.orderId
            const query = {
                orderId: {
                    $regex: orderId
                }
            }
            const result = await selectedOrderCollection.deleteMany(query)
            res.send(result)
        })

        //add product
        app.post('/add-product', verifyToken, verifyAdmin, async (req, res) => {
            const productData = req.body;
            const lastProduct = await productCollection.find().sort({ _id: -1 }).limit(1).toArray()

            const lastProductId = lastProduct[0].productId

            if (lastProduct.length > 0) {
                const addProduct = await productCollection.insertOne(productData)
                const query = { _id: new ObjectId(addProduct.insertedId) }
                const options = { upsert: true }
                const updateDoc = {
                    $set: {
                        productId: lastProductId + 1
                    }
                }

                const result = await productCollection.updateOne(query, updateDoc, options)

                res.send(result)

            } else {
                res.send({ message: 'undefined' })
            }

        })

        //update stock product
        app.put('/stockAdded/:productId', async (req, res) => {
            const productId = parseInt(req.params.productId)
            const stockAdded = parseInt(req.body.stockAmounts)

            const query = { productId: productId }
            const checkProduct = await productCollection.findOne(query)

            if (checkProduct) {

                updateDoc = {
                    $set: {
                        stock: checkProduct.stock + stockAdded
                    }
                }
                const result = await productCollection.updateOne(query, updateDoc)
                res.send(result)
            }

            else {
                res.send({ message: 'forbidden access' })
            }


        })

        //stats api
        app.get('/totalMoney', verifyToken, verifyAdmin, async (req, res) => {
            const totalOrders = await confirmOrderCollection.find().toArray()
            res.send(totalOrders)
        })
        app.get('/stat-allusers', verifyToken, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray()
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