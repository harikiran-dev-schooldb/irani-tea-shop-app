package com.iraniteashop.mobile.model

data class MenuItem(
    val id: String,
    val name: String,
    val category: String,
    val price: Int,
    val isAvailable: Boolean,
    val stockQty: Int,
    val lowStockThreshold: Int,
)

data class Order(
    val id: String,
    val orderNo: Int,
    val customer: String,
    val itemCount: Int,
    val total: Int,
    val status: String,
    val createdAt: String,
)

data class OrderItem(
    val id: String,
    val orderId: String,
    val menuItemId: String?,
    val name: String,
    val quantity: Int,
    val unitPrice: Int,
)

data class Transaction(
    val id: String,
    val type: String,
    val category: String,
    val amount: Int,
    val note: String,
    val paymentMode: String,
    val createdAt: String,
)

data class DailyClosing(
    val id: String,
    val businessDate: String,
    val openingCash: Int,
    val expectedCash: Int,
    val actualCash: Int,
    val difference: Int,
    val closedAt: String,
)

data class ShopData(
    val menu: List<MenuItem> = emptyList(),
    val orders: List<Order> = emptyList(),
    val orderItems: List<OrderItem> = emptyList(),
    val transactions: List<Transaction> = emptyList(),
    val closings: List<DailyClosing> = emptyList(),
)

data class CartLine(
    val item: MenuItem,
    val quantity: Int,
) {
    val total: Int get() = item.price * quantity
}
