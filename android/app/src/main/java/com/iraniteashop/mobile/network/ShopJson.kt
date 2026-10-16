package com.iraniteashop.mobile.network

import com.iraniteashop.mobile.model.DailyClosing
import com.iraniteashop.mobile.model.MenuItem
import com.iraniteashop.mobile.model.Order
import com.iraniteashop.mobile.model.OrderItem
import com.iraniteashop.mobile.model.ShopData
import com.iraniteashop.mobile.model.Transaction
import org.json.JSONArray
import org.json.JSONObject

object ShopJson {
    fun parse(raw: String): ShopData {
        val root = JSONObject(raw)
        root.optString("error").takeIf { it.isNotBlank() }?.let { throw IllegalStateException(it) }
        return ShopData(
            menu = root.array("menu").objects().map {
                MenuItem(
                    id = it.string("id"),
                    name = it.string("name"),
                    category = it.string("category"),
                    price = it.optInt("price"),
                    isAvailable = it.optBoolean("isAvailable", true),
                    stockQty = it.optInt("stockQty", 50),
                    lowStockThreshold = it.optInt("lowStockThreshold", 10),
                )
            },
            orders = root.array("orders").objects().map {
                Order(
                    id = it.string("id"),
                    orderNo = it.optInt("orderNo"),
                    customer = it.optString("customer", "Walk-in"),
                    itemCount = it.optInt("itemCount"),
                    total = it.optInt("total"),
                    status = it.optString("status", "preparing"),
                    createdAt = it.optString("createdAt"),
                )
            },
            orderItems = root.array("orderItems").objects().map {
                OrderItem(
                    id = it.string("id"),
                    orderId = it.string("orderId"),
                    menuItemId = it.optString("menuItemId").takeIf(String::isNotBlank),
                    name = it.string("name"),
                    quantity = it.optInt("quantity"),
                    unitPrice = it.optInt("unitPrice"),
                )
            },
            transactions = root.array("transactions").objects().map {
                Transaction(
                    id = it.string("id"),
                    type = it.optString("type"),
                    category = it.optString("category"),
                    amount = it.optInt("amount"),
                    note = it.optString("note"),
                    paymentMode = it.optString("paymentMode", "cash"),
                    createdAt = it.optString("createdAt"),
                )
            },
            closings = root.array("closings").objects().map {
                DailyClosing(
                    id = it.string("id"),
                    businessDate = it.optString("businessDate"),
                    openingCash = it.optInt("openingCash"),
                    expectedCash = it.optInt("expectedCash"),
                    actualCash = it.optInt("actualCash"),
                    difference = it.optInt("difference"),
                    closedAt = it.optString("closedAt"),
                )
            },
        )
    }

    private fun JSONObject.array(name: String): JSONArray = optJSONArray(name) ?: JSONArray()
    private fun JSONArray.objects(): List<JSONObject> =
        (0 until length()).mapNotNull { optJSONObject(it) }
    private fun JSONObject.string(name: String): String =
        optString(name).takeIf(String::isNotBlank)
            ?: throw IllegalStateException("Missing $name in shop response")
}
