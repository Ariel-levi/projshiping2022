const express = require("express");
const { OrderModel, validateOrder } = require("../models/orderModel");
const router = express.Router();

router.get("/", (req,res) => {
  res.json({msg:"orders work"})
})
// return user's orders
router.get("/userOrder", auth, async (req, res) => {
  try {
    let data = await OrderModel.find({user_id:req.tokenData._id})
    .limit(20)
    .sort({_id:-1})//return the last 20 orders
    res.json(data)
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
    
  }
    
})
// return all orders
//need to add auth admin
router.get("/allOrders", async (req, res) => {
  let perPage = req.query.perPage || 5
  let page = req.query.page >= 1 ? req.query.page - 1 : 0;
  let sort = req.query.sort || "_id";
  let reverse = req.query.reverse == "yes" ? -1 : 1;
  let user_id = req.query.user_id;
  
  try {
    let filter = user_id? {user_id} : {}
    let data = await OrderModel.find(filter) //filter by user id if delivered
    .limit(perPage)
    .skip(perPage*page)
    .sort({[sort]:reverse})
    res.json(data)
  } catch (error) {
    res.status(500).json(error)   
  }
})
// return the orders' amount
router.get("/allOrdersCount", async (req, res) => {
  try {
    let amount = await OrderModel.countDocuments({})
  res.json({amount})
  } catch (error) {
    log.error(error)
    return res.status(500).json(error)
  }
})

router.get("/orderInfo/:idOrder", auth, async(req, res) => {
  try {
    let order = await OrderModel.findOne({_id: req.params.idOrder})
    let prodSortIds_ar = order.products_ar.map(item=> item.s_id)
    let products = await ProductModel.find({short_id:{$in:prodSortIds_ar}})
    res.json({order, products});
  } catch (error) {
    console.log(error);
    res.status(500).json(error)
  }
})

router.post("/", auth, async(req,res) => {
  let validBody = validateOrder(req.body);
    if (validBody.error) {
      return res.status(400).json(validBody.error.details);
    }
    try{
      // get user's data 
      let user = await UserModel.findOne({_id:req.tokenData._id})
      req.body.name = user.name;
      req.body.address = user.address;
      req.body.phone = user.phone;
      // check if there already order of the same user that pending
      let order = await OrderModel.findOne({user_id:req.tokenData._id,status:"pending"})
      if(order){
        // update 
        let data = await OrderModel.updateOne({_id:order._id},req.body)
        return res.json(data)
      }
      // add new order
      let newOrder = new OrderModel(req.body);
      newOrder.user_id = req.tokenData._id;
      await newOrder.save()
      return res.status(201).json(newOrder);
    }
    catch(err){
      console.log(err);
      return res.status(500).json(err);
    }
  })
  
  router.patch("/orderPaid", auth,  async(req,res) => {
    let status = "paid"
      try{
        //check if paypal did the transaction
        let tokenId = req.body.tokenId
        let orderId = req.body.orderId
        let realPay = (req.body.realPay == "yes") // true or false
        let paypalData = await payPalAuth(tokenId, orderId, realPay)
        if (paypalData.status != "COMPLETED"){
          res.status(401).json({err_msg:"There is problem with the transaction"})
        }
        // get the ids of the penging order
        let currentOrder = await OrderModel.findOne({status:"pending", user_id:req.tokenData._id})
        let shorProds_ids = currentOrder.products_ar.map(item => {return item.s_id})
        //get the details of the products
        let prod_ar = await ProductModel.find({short_id:{$in:shorProds_ids}})
        //substruct 1 from each product
        prod_ar.forEach(async (item) => {
          item.qty -= 1;
          // update the new quantity
          await ProductModel.updateOne({_id:item._id}, item)
        })
        //update the status to paid
        let data = await OrderModel.updateOne({status:"pending" , user_id:req.tokenData._id}, {status})//shortcut becouse is same name
        // modifiedCount
        res.json(data);
      }
      catch(err){
        console.log(err);
        return res.status(500).json(err);
      }
    })
// route update order status
// ?status = 
router.patch("/:orderId", authAdmin,  async(req,res) => {
    let status = req.query.status || "pending";
    let orderId = req.params.orderId;
    try{
      let data = await OrderModel.updateOne({_id:orderId},{status})//shortcut becouse is same name
      // modifiedCount
      res.json(data);
    }
    catch(err){
      console.log(err);
      return res.status(500).json(err);
    }
  })
  
  router.delete("/:delId", authAdmin ,  async(req,res) => {
    let orderId = req.params.delId;
    try{
      let data = await OrderModel.deleteOne({_id:orderId})
      // modifiedCount
      res.json(data);
    }
    catch(err){
      console.log(err);
      return res.status(500).json(err);
    }
  })
  

module.exports = router;