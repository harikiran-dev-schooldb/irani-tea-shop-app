package com.iraniteashop.mobile.network

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Test

class ShopJsonTest {
    @Test
    fun parsesShopPayload() {
        val payload = """
            {
              "menu": [{
                "id": "tea",
                "name": "Irani Tea",
                "category": "Tea",
                "price": 15,
                "isAvailable": true,
                "stockQty": 12,
                "lowStockThreshold": 10
              }],
              "orders": [{
                "id": "order-1",
                "orderNo": 101,
                "customer": "Walk-in",
                "itemCount": 2,
                "total": 30,
                "status": "preparing",
                "createdAt": "2026-10-16T04:00:00.000Z"
              }],
              "orderItems": [],
              "transactions": [],
              "closings": []
            }
        """.trimIndent()

        val data = ShopJson.parse(payload)

        assertEquals("Irani Tea", data.menu.single().name)
        assertEquals(15, data.menu.single().price)
        assertEquals(101, data.orders.single().orderNo)
        assertFalse(data.menu.single().stockQty <= data.menu.single().lowStockThreshold)
    }
}
