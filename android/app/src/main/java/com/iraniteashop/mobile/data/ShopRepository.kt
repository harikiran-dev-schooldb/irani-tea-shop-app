package com.iraniteashop.mobile.data

import android.content.Context
import com.iraniteashop.mobile.model.CartLine
import com.iraniteashop.mobile.model.Order
import com.iraniteashop.mobile.model.ShopData
import com.iraniteashop.mobile.network.ShopApiClient
import com.iraniteashop.mobile.network.ShopApiException

data class ShopResult(val data: ShopData, val fromCache: Boolean)

class ShopRepository(context: Context) {
    private val api = ShopApiClient()
    private val preferences = context.getSharedPreferences("irani-tea-cache", Context.MODE_PRIVATE)

    suspend fun load(): ShopResult = try {
        val (data, raw) = api.load()
        cache(raw)
        ShopResult(data, false)
    } catch (error: Exception) {
        if (error is ShopApiException && error.statusCode in 400..499) {
            clearCache()
            throw error
        }
        val cached = preferences.getString(CACHE_DATA, null)
        if (cached.isNullOrBlank()) throw error
        ShopResult(com.iraniteashop.mobile.network.ShopJson.parse(cached), true)
    }

    suspend fun createOrder(customer: String, paymentMode: String, lines: List<CartLine>) =
        api.createOrder(customer, paymentMode, lines).also { cache(it.second) }.first

    suspend fun addExpense(category: String, amount: Int, note: String) =
        api.addExpense(category, amount, note).also { cache(it.second) }.first

    suspend fun updateOrderStatus(id: String, status: String) =
        api.updateOrderStatus(id, status).also { cache(it.second) }.first

    suspend fun updateOrder(order: Order, customer: String, itemCount: Int, total: Int) =
        api.updateOrder(order.id, customer, itemCount, total, order.createdAt)
            .also { cache(it.second) }
            .first

    suspend fun deleteOrder(id: String) =
        api.deleteOrder(id).also { cache(it.second) }.first

    suspend fun toggleMenuItem(id: String, isAvailable: Boolean) =
        api.toggleMenuItem(id, isAvailable).also { cache(it.second) }.first

    fun clearCache() {
        preferences.edit().remove(CACHE_DATA).apply()
    }

    private fun cache(raw: String) {
        preferences.edit().putString(CACHE_DATA, raw).apply()
    }

    private companion object {
        const val CACHE_DATA = "shop-data"
    }
}
