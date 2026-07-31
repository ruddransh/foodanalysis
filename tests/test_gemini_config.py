import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import app


class GeminiConfigTests(unittest.TestCase):
    def test_gemini_api_key_prefers_gemini_env(self):
        with patch.dict(os.environ, {"GEMINI_API_KEY": "gemini-test-key", "OPEN_AI_KEY": "old"}, clear=False):
            self.assertEqual(app.get_api_key(), "gemini-test-key")

    def test_gemini_model_uses_2_5(self):
        self.assertEqual(app.GEMINI_MODEL, "gemini-2.5-flash")


if __name__ == "__main__":
    unittest.main()
