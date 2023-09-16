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
        } else if (file.name.endsWith(".xml")) {
          parseXML(fileContent);
        } else {
          toast.error("Unsupported file format. Please upload a CSV or XML file.");
        }
      };
      fileReader.readAsText(file);
    }
  };

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

  //Validation of CSV format
  const validateCSVData = (data) => {
    const transactionReferences = new Set();
    const failedRecords = [];

    data.forEach((record) => {
      console.log("record",record)
      const { Reference, Description, "End Balance" : EndBalance} = record;
      let remarks = "";

      if (transactionReferences.has(Reference)) {
        remarks = "Duplicate Reference";
      } else {
        transactionReferences.add(Reference);
      }

      if (remarks === "Duplicate Reference") {
        failedRecords.push({
          Reference,
          Description,
          EndBalance,
          Remarks: remarks
        });
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
      const endNode = child.children.find((endBalance) => endBalance.name === "endBalance").value;

      let remarks = "";

      if (transactionReferences.has(reference)) {
        remarks = "Duplicate Reference";
      } else {
        transactionReferences.add(reference);
        remarks = "No duplicate reference found";
      }

      failedRecords.push({
        Reference: reference,
        Description: descriptionNode,
        EndBalance : endNode,
        Remarks: remarks
      });
    });

    setValidationReport(failedRecords);
  };

  // excel download
  const downloadReport = () => {
    if (validationReport.length === 0) {
      toast.error("No validation report available to download.");
      return;
    }

    const ws = XLSX.utils.json_to_sheet(validationReport);
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
          Choose File
        </label>
        <p className="filename">Selected File: {selectedFileName}</p>
      </div>

      {validationReport.length > 0 && (
        <div>
          <h2 className='content'>Validation Report</h2>
          <div className="button">
          <button className="download" onClick={downloadReport}>
            Download Validation Report
          </button>
          </div>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Transaction Reference</th>
                <th>Description</th>
                <th>End Balance</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {validationReport.map((record, index) => (
                <tr key={index}>
                  <td>{record.Reference}</td>
                  <td>{record.Description}</td>
                  <td>{record.EndBalance}</td>
                  <td>{record.Remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ToastContainer position="top-right" />
    </div>
  );
}

export default App;