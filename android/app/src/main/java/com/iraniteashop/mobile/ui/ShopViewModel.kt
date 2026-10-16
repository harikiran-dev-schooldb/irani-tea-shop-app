package com.iraniteashop.mobile.ui

import android.app.Application
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.iraniteashop.mobile.data.ShopRepository
import com.iraniteashop.mobile.model.CartLine
import com.iraniteashop.mobile.model.MenuItem
import com.iraniteashop.mobile.model.Order
import com.iraniteashop.mobile.model.ShopData
import kotlinx.coroutines.launch

data class ShopUiState(
    val data: ShopData = ShopData(),
    val loading: Boolean = true,
    val saving: Boolean = false,
    val fromCache: Boolean = false,
    val message: String? = null,
    val cart: List<CartLine> = emptyList(),
)

class ShopViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = ShopRepository(application)
    private val _state = mutableStateOf(ShopUiState())
    val state: State<ShopUiState> = _state

    init {
        refresh()
    }

    fun refresh() {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, message = null)
            runCatching { repository.load() }
                .onSuccess { result ->
                    _state.value = _state.value.copy(
                        data = result.data,
                        loading = false,
                        fromCache = result.fromCache,
                        message = if (result.fromCache) "Offline: showing the latest saved data" else null,
                    )
                }
                .onFailure { error ->
                    _state.value = _state.value.copy(
                        loading = false,
                        message = error.userMessage("Could not connect to the shop server"),
                    )
                }
        }
    }

    fun addToCart(item: MenuItem) {
        if (!item.isAvailable || item.stockQty <= 0) return
        val current = _state.value.cart
        val existing = current.firstOrNull { it.item.id == item.id }
        val updated = if (existing == null) {
            current + CartLine(item, 1)
        } else {
            current.map {
                if (it.item.id == item.id && it.quantity < item.stockQty) it.copy(quantity = it.quantity + 1)
                else it
            }
        }
        _state.value = _state.value.copy(cart = updated)
    }

    fun changeQuantity(itemId: String, delta: Int) {
        val updated = _state.value.cart.mapNotNull { line ->
            if (line.item.id != itemId) line
            else (line.quantity + delta)
                .coerceAtMost(line.item.stockQty)
                .takeIf { it > 0 }
                ?.let { line.copy(quantity = it) }
        }
        _state.value = _state.value.copy(cart = updated)
    }

    fun placeOrder(customer: String, paymentMode: String, onComplete: () -> Unit) {
        val lines = _state.value.cart
        if (lines.isEmpty()) return
        mutate("Order saved", onComplete) {
            repository.createOrder(customer, paymentMode, lines).also {
                _state.value = _state.value.copy(cart = emptyList())
            }
        }
    }

    fun addExpense(category: String, amount: Int, note: String, onComplete: () -> Unit) {
        if (amount <= 0) return
        mutate("Expense saved", onComplete) { repository.addExpense(category, amount, note) }
    }

    fun updateOrderStatus(id: String, status: String) {
        mutate("Order updated") { repository.updateOrderStatus(id, status) }
    }

    fun updateOrder(
        order: Order,
        customer: String,
        itemCount: Int,
        total: Int,
        onComplete: () -> Unit,
    ) {
        if (itemCount <= 0 || total <= 0) return
        mutate("Order #${order.orderNo} updated", onComplete) {
            repository.updateOrder(order, customer, itemCount, total)
        }
    }

    fun deleteOrder(order: Order, onComplete: () -> Unit) {
        mutate("Order #${order.orderNo} deleted", onComplete) {
            repository.deleteOrder(order.id)
        }
    }

    fun toggleMenuItem(item: MenuItem) {
        mutate(if (item.isAvailable) "Item paused" else "Item available") {
            repository.toggleMenuItem(item.id, !item.isAvailable)
        }
    }

    fun clearMessage() {
        _state.value = _state.value.copy(message = null)
    }

    private fun mutate(
        successMessage: String,
        onComplete: () -> Unit = {},
        operation: suspend () -> ShopData,
    ) {
        if (_state.value.saving) return
        viewModelScope.launch {
            _state.value = _state.value.copy(saving = true, message = null)
            runCatching { operation() }
                .onSuccess { data ->
                    _state.value = _state.value.copy(
                        data = data,
                        saving = false,
                        fromCache = false,
                        message = successMessage,
                    )
                    onComplete()
                }
                .onFailure { error ->
                    _state.value = _state.value.copy(
                        saving = false,
                        message = error.userMessage("Could not save changes"),
                    )
                }
        }
    }

    private fun Throwable.userMessage(fallback: String): String =
        message?.takeIf { it.isNotBlank() } ?: fallback
}
