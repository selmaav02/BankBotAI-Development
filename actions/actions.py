from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet


class ActionCheckBalance(Action):

    def name(self) -> Text:
        return "action_check_balance"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        account_type = tracker.get_slot("account_type")
        account_number = tracker.get_slot("account_number")

        # Format account number display
        acc_display = account_number if account_number else "your account"

        if account_type and account_type.lower() == "current":
            dispatcher.utter_message(
                text=f"Your Current Account balance (A/C: {acc_display}) is ₹1,20,000. Is there anything else I can help you with?"
            )
        elif account_type and account_type.lower() == "savings":
            dispatcher.utter_message(
                text=f"Your Savings Account balance (A/C: {acc_display}) is ₹25,000. Is there anything else I can help you with?"
            )
        else:
            dispatcher.utter_message(
                text=f"Your account balance (A/C: {acc_display}) is \u20b95,432.78. Is there anything else I can help you with?"
            )

        return [
            SlotSet("account_type", None),
            SlotSet("account_number", None)
        ]


class ActionLoanInfo(Action):

    def name(self) -> Text:
        return "action_loan_info"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        loan_type = tracker.get_slot("loan_type")

        if loan_type:
            loan_type = loan_type.lower()

        if loan_type == "personal":
            dispatcher.utter_message(
                text="Personal Loan:\nInterest: 11%\nMax Amount: ₹25,00,000\nTenure: Up to 5 years\n\nRequired Documents:\n- Aadhaar\n- PAN\n- Income Proof\n- Bank Statements (last 6 months)"
            )
        elif loan_type == "home":
            dispatcher.utter_message(
                text="Home Loan:\nInterest: 8.5%\nMax Amount: ₹1,00,00,000\nTenure: Up to 30 years\n\nRequired Documents:\n- Aadhaar\n- PAN\n- Property Papers\n- Income Proof\n- Bank Statements (last 6 months)"
            )
        elif loan_type == "car":
            dispatcher.utter_message(
                text="Car Loan:\nInterest: 9%\nMax Amount: ₹50,00,000\nTenure: Up to 7 years\n\nRequired Documents:\n- Aadhaar\n- PAN\n- Vehicle Quotation\n- Income Proof"
            )
        elif loan_type == "education" or loan_type == "educational":
            dispatcher.utter_message(
                text="Education Loan:\nInterest: 7.5%\nMax Amount: ₹75,00,000\nTenure: Up to 15 years\n\nRequired Documents:\n- Aadhaar\n- PAN\n- Admission Letter\n- Fee Structure\n- Co-applicant Documents"
            )
        else:
            dispatcher.utter_message(
                text="Sorry, I could not identify the loan type. Please choose: Personal, Home, Car, or Education."
            )

        return [SlotSet("loan_type", None)]
