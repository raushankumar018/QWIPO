import os
from dotenv import load_dotenv
import google.generativeai as genai 
# FIX: Removed explicit import of GenerateContentConfig to avoid ImportError.

load_dotenv()  # Load .env file

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# --- Configure Gemini Globally (Run only once) ---
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        print("Gemini client configured successfully.")
    except Exception as e:
        print(f"FATAL ERROR: Failed to configure Gemini client: {e}")
else:
    print("WARNING: GEMINI_API_KEY is missing. AI rationale will fail.")

# --- Prompt Builder Function ---

def build_explain_prompt(retailer_id: str, recommendations: list):
    """
    Build a structured prompt for Gemini. The list of recommendations now includes
    calculated context flags (frequent, trending, seasonal_guess).
    
    FIX: Embed the system instruction directly into the prompt text to avoid crashing keyword arguments.
    """
    
    # 1. Define the AI's persona and constraints (embedded directly in the prompt)
    persona_and_constraints = (
        "You are Qwipo's expert Retail Procurement Analyst. Your goal is to provide "
        "short, data-backed, and persuasive reasons why a kirana store retailer "
        f"({retailer_id}) should immediately purchase the recommended products. "
        "Focus on improving the retailer's inventory, profitability, and customer satisfaction."
    )

    lines = [persona_and_constraints, "\n", f"Retailer ID: {retailer_id}\n"]
    lines.append("Analyze the following products and provide an actionable reason for stocking them:\n")
    
    # 2. Provide the structured data to the model
    for r in recommendations:
        # Create clear flags for Gemini to use in its explanation
        flags = []
        if r.get('is_frequent'):
            flags.append("FREQUENT_REORDER (High repurchase rate)")
        if r.get('is_trending'):
            flags.append("MARKET_TREND (Popular with similar retailers)")
        if r.get('seasonal_guess'):
            flags.append(f"SEASONAL_PEAK ({r['seasonal_guess']})")
        
        flags_text = f" Context: {', '.join(flags)}" if flags else " Context: BASED_ON_SIMILARITY"

        lines.append(
            f"\n- Product Title: {r['title']}\n"
            f"  Category: {r['category']}\n"
            f"{flags_text}"
        )

    # 3. Define the desired output format
    lines.append(
        "\n--- INSTRUCTIONS ---\n"
        "1. For each Product Title, generate a single, powerful 1-2 sentence statement "
        "explaining why the retailer should buy it now. Use the Context flags provided. "
        "Do NOT mention scores or product IDs.\n"
        "2. Format each explanation exactly as: '- Product Title: [Explanation]'\n"
        "3. Provide a single 'Actionable Tip' for the retailer at the end, starting with 'Actionable Tip: '."
    )
    
    return "\n".join(lines)


# --- Update call_gemini to handle the new structured prompt and output parsing ---
def call_gemini(prompt: str):
    """
    Call Gemini API and return structured explanations per product.
    """
    try:
        # Ensure configuration is present before proceeding
        if not GEMINI_API_KEY:
            raise ValueError("API key not configured.")
        
        # FIX: Pass only the essential contents argument to avoid crashing keyword arguments
        model = genai.GenerativeModel("gemini-2.5-flash")
        
        response = model.generate_content(
            contents=prompt  # Use the entire prompt string as contents
        )
        
        text = response.text if response and response.text else "No explanation generated."
        
        # --- Parse response into structured items and tip ---
        lines = text.strip().split("\n")
        items = []
        tip = ""

        for line in lines:
            line = line.strip()
            if line.startswith("- "):
                # Expecting format: - Product Name: Explanation
                parts = line[2:].split(":", 1)
                title = parts[0].strip()
                explanation = parts[1].strip() if len(parts) > 1 else ""
                items.append({"title": title, "text": explanation})
            elif line.lower().startswith("actionable tip:"):
                tip = line.split(":", 1)[1].strip()
            else:
                # Accumulate any lines that follow the tip but aren't new product bullets
                if tip:
                    tip += " " + line

        return {"items": items, "tip": tip.strip() or "Review your purchasing strategy for maximizing profit."}

    except Exception as e:
        # Handle potential API errors or configuration issues
        print(f"Error calling Gemini API: {e}")
        return {"items": [], "tip": f"[AI Analysis Unavailable: {e}]"}