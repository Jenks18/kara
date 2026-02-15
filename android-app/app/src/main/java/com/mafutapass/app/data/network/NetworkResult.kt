package com.mafutapass.app.data.network

/**
 * Sealed class representing the result of a network operation.
 * 
 * This provides a consistent way to handle API responses across the app:
 * - Success: Contains the data from the API
 * - Error: Contains error information (message, code, exception)
 * - Loading: Represents in-progress state (useful for Flow emissions)
 * 
 * Usage:
 * ```
 * when (result) {
 *     is NetworkResult.Success -> handleData(result.data)
 *     is NetworkResult.Error -> handleError(result.message)
 *     is NetworkResult.Loading -> showLoading()
 * }
 * ```
 */
sealed class NetworkResult<out T> {
    
    /**
     * Successful response with data
     */
    data class Success<out T>(val data: T) : NetworkResult<T>()
    
    /**
     * Error response with details
     */
    data class Error(
        val message: String,
        val code: Int? = null,
        val exception: Throwable? = null
    ) : NetworkResult<Nothing>()
    
    /**
     * Loading state
     */
    data object Loading : NetworkResult<Nothing>()
    
    /**
     * Check if this is a successful result
     */
    val isSuccess: Boolean get() = this is Success
    
    /**
     * Check if this is an error result
     */
    val isError: Boolean get() = this is Error
    
    /**
     * Check if this is loading
     */
    val isLoading: Boolean get() = this is Loading
    
    /**
     * Get data or null if not successful
     */
    fun getOrNull(): T? = (this as? Success)?.data
    
    /**
     * Get data or throw if not successful
     */
    fun getOrThrow(): T = when (this) {
        is Success -> data
        is Error -> throw exception ?: RuntimeException(message)
        is Loading -> throw IllegalStateException("Result is still loading")
    }
    
    /**
     * Get data or default value
     */
    fun getOrDefault(default: @UnsafeVariance T): T = (this as? Success)?.data ?: default
    
    /**
     * Transform success data
     */
    inline fun <R> map(transform: (T) -> R): NetworkResult<R> = when (this) {
        is Success -> Success(transform(data))
        is Error -> this
        is Loading -> this
    }
    
    /**
     * Execute action on success
     */
    inline fun onSuccess(action: (T) -> Unit): NetworkResult<T> {
        if (this is Success) action(data)
        return this
    }
    
    /**
     * Execute action on error
     */
    inline fun onError(action: (String, Int?, Throwable?) -> Unit): NetworkResult<T> {
        if (this is Error) action(message, code, exception)
        return this
    }
    
    companion object {
        /**
         * Create a success result
         */
        fun <T> success(data: T): NetworkResult<T> = Success(data)
        
        /**
         * Create an error result
         */
        fun error(message: String, code: Int? = null, exception: Throwable? = null): NetworkResult<Nothing> =
            Error(message, code, exception)
        
        /**
         * Create a loading result
         */
        fun loading(): NetworkResult<Nothing> = Loading
    }
}

/**
 * Extension to convert Retrofit Response to NetworkResult
 */
suspend fun <T> safeApiCall(
    apiCall: suspend () -> T
): NetworkResult<T> {
    return try {
        NetworkResult.Success(apiCall())
    } catch (e: retrofit2.HttpException) {
        val errorBody = e.response()?.errorBody()?.string()
        val errorMessage = parseErrorMessage(errorBody) ?: e.message()
        NetworkResult.Error(
            message = errorMessage,
            code = e.code(),
            exception = e
        )
    } catch (e: java.net.UnknownHostException) {
        NetworkResult.Error(
            message = "No internet connection",
            exception = e
        )
    } catch (e: java.net.SocketTimeoutException) {
        NetworkResult.Error(
            message = "Connection timed out",
            exception = e
        )
    } catch (e: java.io.IOException) {
        NetworkResult.Error(
            message = "Network error: ${e.message}",
            exception = e
        )
    } catch (e: Exception) {
        NetworkResult.Error(
            message = e.message ?: "Unknown error occurred",
            exception = e
        )
    }
}

/**
 * Parse error message from JSON error body
 */
private fun parseErrorMessage(errorBody: String?): String? {
    if (errorBody.isNullOrEmpty()) return null
    return try {
        val json = org.json.JSONObject(errorBody)
        json.optString("message") 
            ?: json.optString("error")
            ?: json.optString("detail")
    } catch (e: Exception) {
        null
    }
}
