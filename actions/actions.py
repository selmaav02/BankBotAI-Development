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

        if account_type and account_type.lower() == "current":
            dispatcher.utter_message(text="Your Current Account balance is ₹1,20,000.")
        elif account_type and account_type.lower() == "savings":
            dispatcher.utter_message(text="Your Savings Account balance is ₹25,000.")
        else:
            dispatcher.utter_message(text="Your Savings Account balance is ₹25,000.")

        return [SlotSet("account_type", None)]


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
                text="Personal Loan:\nInterest: 11%\nRequired Documents:\n- Aadhaar\n- PAN\n- Income Proof"
            )
        elif loan_type == "home":
            dispatcher.utter_message(
                text="Home Loan:\nInterest: 8.5%\nRequired Documents:\n- Aadhaar\n- PAN\n- Property Papers"
            )
        elif loan_type == "car":
            dispatcher.utter_message(
                text="Car Loan:\nInterest: 9%\nRequired Documents:\n- Aadhaar\n- PAN\n- Vehicle Quotation"
            )
        elif loan_type == "education" or loan_type == "educational":
            dispatcher.utter_message(
                text="Education Loan:\nInterest: 7.5%\nRequired Documents:\n- Aadhaar\n- PAN\n- Admission Letter"
            )
        else:
            dispatcher.utter_message(text="Sorry, I could not identify the loan type. Please choose: Personal, Home, Car, or Education.")

        return [SlotSet("loan_type", None)]
