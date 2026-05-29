def check_and_raise_api_error(error_str: str):
    """Check for API errors and raise appropriate exceptions"""
    if "API key not valid" in error_str or "API_KEY_INVALID" in error_str:
        raise Exception(
            "API key is invalid or missing. Please check your GEMINI_API_KEY environment variable."
        )
    if (
        "RESOURCE_EXHAUSTED" in error_str
        or "quota" in error_str.lower()
        or "429" in error_str
    ):
        raise Exception(
            "API quota exceeded. You've reached the rate limit. Please try again later or check your billing plan."
        )
