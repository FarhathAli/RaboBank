import './App.css';
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { saveAs } from "file-saver";
import React, { useState } from "react";
import XMLParser from "react-xml-parser";
import "react-toastify/dist/ReactToastify.css";
import { ToastContainer, toast } from "react-toastify";

function App() {
  const [fileData, setFileData] = useState(null);
  const [validationReport, setValidationReport] = useState([]);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  //uploading a file
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFileName(file ? file.name : "");
    setFileData(null);
    setValidationReport([]);
    if (file) {
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        const fileContent = e.target.result;
        if (file.name.endsWith(".csv")) {
          parseCSV(fileContent);
          setErrorMessage("");
        } else if (file.name.endsWith(".xml")) {
          parseXML(fileContent);
          setErrorMessage("");
        } else {
          setErrorMessage(
            "Unsupported file format. Please upload a CSV or XML file."
          );
        }
      };
      fileReader.readAsText(file, "ISO-8859-1");
    }
  };
  console.log("fileData", fileData)

  //CSV sheet
  const parseCSV = (fileContent) => {
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      encoding: "UTF-8",
      complete: (result) => {
        setFileData(result.data);
        validateCSVData(result.data);
      },
      error: (error) => {
        toast.error("CSV Parsing Error:", error.message);
      }
    });
  };

  //XML sheet
  const parseXML = (fileContent) => {
    try {
      const xml = new XMLParser().parseFromString(fileContent);
      setFileData(xml);
      validateXMLData(xml);
    } catch (error) {
      toast.error(
        "Invalid XML file. Please ensure it contains the expected structure."
      );
    }
  };

  // Validation of CSV format
  const validateCSVData = (data) => {
  const transactionReferences = new Set();
  const failedRecords = [];

  data.forEach((record) => {
    console.log("record", record);
    const { Reference, Description, "End Balance": EndBalance, "Start Balance": StartBalance, Mutation } = record;

    if (StartBalance && Mutation && EndBalance) {
      const startBalanceFloat = parseFloat(StartBalance.replace(',', '').trim());
      const mutationFloat = parseFloat(Mutation.replace(',', '').trim());
      const endBalanceFloat = parseFloat(EndBalance.replace(',', '').trim());

      let remarks = "";

      if (Math.abs(endBalanceFloat - (startBalanceFloat + mutationFloat)) > 0.001) {
        remarks += "End Balance Error";
      }

      if (transactionReferences.has(Reference)) {
        if (remarks !== "") {
          remarks += " ";
        }
        remarks += "Duplicate Reference";
      } else {
        transactionReferences.add(Reference);
      }

      // Display the record only if there are any remarks
      if (remarks !== "") {
        failedRecords.push({
          Reference,
          Description,
          Remarks: remarks,
        });
      }
    }
  });

  setValidationReport(failedRecords);
};

  //Validation of XML format
  const validateXMLData = (xml) => {
    console.log("xml", xml)
    const transactionReferences = new Set();
    const failedRecords = [];

    xml.children.forEach((child) => {
      const reference = child.attributes.reference;
      const descriptionNode = child.children.find((description) => description.name === "description").value;
      const startBalance = parseFloat(child.children.find((startBalance) => startBalance.name === "startBalance").value);
      const mutation = parseFloat(child.children.find((mutation) => mutation.name === "mutation").value);
      const endNode = parseFloat(child.children.find((endBalance) => endBalance.name === "endBalance").value);

      let remarks = "";

      if (transactionReferences.has(reference)) {
        remarks = "Duplicate Reference";
      } else {
        transactionReferences.add(reference);

       // Compare end balance with start balance + mutation
      if (Math.abs(endNode - (startBalance + mutation)) > 0.001) {
        remarks = "End Balance Error";
      }

      if (remarks === "End Balance Error") {
        failedRecords.push({
          Reference: reference,
          Description: descriptionNode,
          Remarks: remarks,
        });
      }
      }
    });
    setValidationReport(failedRecords);
  };

  // excel download
  const downloadReport = () => {
    if (validationReport.length === 0) {
      toast.error("No validation report available to download.");
      return;
    }

    const modifiedValidationReport = validationReport.map((record) => ({
    "Transaction Reference": record.Reference,
    Description: record.Description,
    "Error Description": record.Remarks,
    }));

    const ws = XLSX.utils.json_to_sheet(modifiedValidationReport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Validation Report");
    const excelBuffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array"
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    });
    saveAs(blob, "validation_report.xlsx");
  };

  return (
    <div className="text">
      <h1 className="customer">Customer Statement Validation</h1>
      <div className="file-upload">
        <label className="custom-file-upload">
          <input type="file" accept=".csv, .xml" onChange={handleFileChange} />
          Validate the Sheet
        </label>
        <p className="filename">Selected File: {selectedFileName}</p>
      </div>
      <div className='error'>
      {errorMessage && (
            <span className="error-message">{errorMessage}</span>
          )}
        </div>
      {validationReport.length > 0 && (
        <div>
          <h2 className='content'>Validation Report</h2>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Transaction Reference</th>
                <th>Description</th>
                <th>Error Description</th>
              </tr>
            </thead>
            <tbody>
              {validationReport.map((record, index) => (
                <tr key={index}>
                  <td>{record.Reference}</td>
                  <td>{record.Description}</td>
                  <td>{record.Remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="button">
            <button className="download" onClick={downloadReport}>
              Download Validation Report
            </button>
          </div>
        </div>
      )}
      <ToastContainer position="top-right" />
    </div>
  );
}

export default App;