import React, { useState, useEffect, useCallback } from "react";
import Display from "./Display";
import Keypad from "./Keypad";
import SidePanel from "./SidePanel";
import { TVM } from "../types";
import { rpn } from "../utils/rpn";
import { computeFV, computeIYR, computeN, computePMT, computePV } from "../utils/tvm";
import { toMonthlyRate, toYearlyRate, toFifteenPercentIR, toTwentyTwoPointFivePercentIR } from "../utils/misc";
import { calculateMonthsBetweenDates } from "../utils/date";
import TutorialGuide from "./TutorialGuide";

const buttonLabels = [
  ["N", "i", "PV", "PMT", "FV"],
  ["→15%IR", "→22.5%IR", "", "", ""],
  ["x⇔y", "CLx", "R↓", "ΔMTS", "→i%mo"],
  ["y^x", "1/x", "√x", "CHS", "→i%yr"],
  ["EEX", "ENTER", "7", "8", "9"],
  ["STO", "RCL", "4", "5", "6"],
  ["+", "-", "1", "2", "3"],
  ["÷", "×", "0", ".", "RESET"],
];

const Calculator: React.FC = () => {
  const [stack, setStack] = useState<string[]>([]);
  const [input, setInput] = useState<string>("");
  const [isResultDisplayed, setIsResultDisplayed] = useState<boolean>(false);
  const [tvm, setTVM] = useState<TVM>({ N: 0, IYR: 0, PV: 0, PMT: 0, FV: 0 });
  const [pressedKey, setPressedKey] = useState<string | null>(null);
  const [dateMode, setDateMode] = useState<boolean>(false);
  const [dateInputs, setDateInputs] = useState<string[]>([]);

  const handleButton = useCallback((label: string) => {
    if (label === "ΔMTS") {
      setDateMode(true);
      setInput("");
      setDateInputs([]);
      return;
    }

    if (dateMode) {
      if ((label >= "0" && label <= "9") || label === ".") {
        if (isResultDisplayed) {
          setInput(label);
          setIsResultDisplayed(false);
        } else {
          setInput(input + label);
        }
      } else if (label === "ENTER") {
        if (input !== "") {
          if (dateInputs.length === 0) {
            setDateInputs([input]);
            setInput("");
          } else {
            const [date1] = dateInputs;
            const result = calculateMonthsBetweenDates(date1, input);
            setInput(result.toString());
            setDateMode(false);
            setDateInputs([]);
            setIsResultDisplayed(true);
          }
        }
      }
      return;
    }

    if (label >= "0" && label <= "9") {
      if (isResultDisplayed) {
        setInput(label);
        setIsResultDisplayed(false);
      } else {
        setInput(input + label);
      }
    } else if (label === ".") {
      if (isResultDisplayed) {
        setInput("0.");
        setIsResultDisplayed(false);
      } else if (!input.includes(".")) {
        setInput(input + ".");
      }
    } else if (label === "ENTER") {
      if (input !== "") {
        setStack([...stack, input]);
        setIsResultDisplayed(true);
      }
    } else if (label === "CLx") {
        setInput("0");
        setIsResultDisplayed(true);
    } else if (label === "CHS") {
      if (input !== "") {
        setInput((prev) => (prev.startsWith("-") ? prev.slice(1) : `-${prev}`));
      }
    } else if (label === "RESET") {
      setStack([]);
      setInput("");
      setTVM({ N: 0, IYR: 0, PV: 0, PMT: 0, FV: 0 });
      setIsResultDisplayed(false);
    } else if (["+", "-", "×", "÷", "y^x", "x⇔y", "R↓", "1/x", "√x"].includes(label)) {
      if (["1/x", "√x"].includes(label) && input === "") {
        return;
      }
      if (["+", "-", "×", "÷", "y^x", "x⇔y", "R↓"].includes(label) && stack.length < 1) {
        return;
      }

      const [newStack, result] = rpn(stack, label, isResultDisplayed ? "" : input);
      setStack(newStack);
      setInput(result);
      setIsResultDisplayed(true);
    }
    // Change of interest rate
    else if (label === "→i%mo") {
      if (input !== "") {
        const iyr = parseFloat(input);
        const imo = toMonthlyRate(iyr);
        setInput(imo.toString());
        setIsResultDisplayed(true);
      }
    }
    else if (label === "→i%yr") {
      if (input !== "") {
        const imo = parseFloat(input);
        const iyr = toYearlyRate(imo);
        setInput(iyr.toString());
        setIsResultDisplayed(true);
      }
    }
    else if (label === "→15%IR") {
      if (input !== "") {
        const value = parseFloat(input);
        const result = toFifteenPercentIR(value);
        setInput(result.toString());
        setIsResultDisplayed(true);
      }
    }
    else if (label === "→22.5%IR") {
      if (input !== "") {
        const value = parseFloat(input);
        const result = toTwentyTwoPointFivePercentIR(value);
        setInput(result.toString());
        setIsResultDisplayed(true);
      }
    }
    // TVM keys
    else if (["N", "i", "PV", "PMT", "FV"].includes(label)) {
      if (input !== "") {
        // Store input value in TVM register
        const value = parseFloat(input);
        setTVM((prev) => {
          const updated = { ...prev };
          if (label === "N") updated.N = value;
          if (label === "i") updated.IYR = value;
          if (label === "PV") updated.PV = value;
          if (label === "PMT") updated.PMT = value;
          if (label === "FV") updated.FV = value;
          return updated;
        });
        setInput("");
        setIsResultDisplayed(false);
      } else {
        // Calculate value for the pressed TVM key
        let newValue: number;
        if (label === "FV") {
          newValue = computeFV(tvm);
        } else if (label === "PV") {
          newValue = computePV(tvm);
        } else if (label === "PMT") {
          newValue = computePMT(tvm);
        } else if (label === "N") {
          newValue = Math.ceil(computeN(tvm));
        } else { // "i"
          newValue = computeIYR(tvm);
        }

        setTVM((prev) => ({ ...prev, [label === "i" ? "IYR" : label]: newValue }));
        setInput(newValue.toString());
        setIsResultDisplayed(true);
      }
    }
  }, [dateMode, isResultDisplayed, input, dateInputs, stack, tvm, setDateMode, setInput, setDateInputs, setIsResultDisplayed, setStack, setTVM]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      let buttonLabel = "";

      if (key >= "0" && key <= "9") {
        buttonLabel = key;
      } else {
        switch (key) {
          case "+":
            buttonLabel = "+";
            break;
          case "-":
            buttonLabel = "-";
            break;
          case "*":
            buttonLabel = "×";
            break;
          case "/":
            buttonLabel = "÷";
            break;
          case "Enter":
            buttonLabel = "ENTER";
            break;
          case ".":
            buttonLabel = ".";
            break;
          default:
            return;
        }
      }

      handleButton(buttonLabel);
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleButton]);


  const getDisplayValue = () => {
    if (dateMode) {
      if (input === "" && dateInputs.length === 0) return "dd.mm.yyyy";
      if (input === "" && dateInputs.length === 1) return "dd.mm.yyyy";
    }
    if (input === "") {
        if (stack.length > 0) {
            const lastInStack = stack[stack.length - 1];
            const num = parseFloat(lastInStack);
            return Number.isInteger(num) ? num.toString() : num.toFixed(2);
        }
        return "0.00";
    }

    if (isResultDisplayed) {
        const num = parseFloat(input);
        if (isNaN(num)) return "Error";
        if (Number.isInteger(num)) return num.toString();
        return num.toFixed(2);
    }

    return input;
  };

  return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "start",
        justifyContent: "center",
        background: "linear-gradient(to right, #434343 0%, black 100%)",
        paddingTop: "50px"
      }}>
        <TutorialGuide />
        <div style={{ display: "flex", gap: "32px" }}>
          <div style={{
            background: "rgba(255, 255, 255, 0.1)",
            borderRadius: "12px",
            boxShadow: "0 4px 24px #0008",
            padding: "32px",
          }}>
            <Display value={getDisplayValue()} />
            <Keypad buttonLabels={buttonLabels} onButtonClick={(label) => {
              setPressedKey(label);
              handleButton(label);
              setTimeout(() => setPressedKey(null), 120);
            }} pressedKey={pressedKey} />
          </div>
          <SidePanel stack={stack} tvm={tvm} />
        </div>
      </div>
    );
  };

export default Calculator;
