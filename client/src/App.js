import React, { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Button, TextField } from '@mui/material';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_URL;

const dropzoneStyles = {
  border: '2px dashed #cccccc',
  borderRadius: '4px',
  padding: '20px',
  textAlign: 'center',
  cursor: 'pointer',
  marginBottom: '20px',
};

const activeDropzoneStyles = {
  border: '2px dashed #2196F3',
};

const UploadButton = ({ onDrop }) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: '.pdf',
  });

  return (
    <div
      {...getRootProps()}
      style={isDragActive ? { ...dropzoneStyles, ...activeDropzoneStyles } : dropzoneStyles}
    >
      <input {...getInputProps()} />
      <Typography variant="h6">Drag & Drop a PDF file here</Typography>
      <Typography variant="body2" color="textSecondary">or click to select a PDF</Typography>
    </div>
  );
};

const App = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [question, setQuestion] = useState('');
  const [showQuestionSection, setShowQuestionSection] = useState(false);
  const [isGettingAnswer, setIsGettingAnswer] = useState(false);
  const [responseMessage, setResponseMessage] = useState('');
  const [askAnswerVisible, setAskAnswerVisible] = useState(false);
  const [errorMessage, setErrorMessage] =useState(null)

  const handleFileDrop = (acceptedFiles) => {
    setSelectedFile(acceptedFiles[0]);
    setErrorMessage('');
  };

  const handleCancelUpload = () => {
    setSelectedFile(null);
    setShowQuestionSection(false);
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    try {
      // Send POST request to backend for embedding and vectorization
      const formData = new FormData();
      formData.append("pdf_file", selectedFile);
      formData.append("file_name", selectedFile.name);
      const response = await fetch(API_BASE_URL+'/embed-and-vectorize', {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        setShowQuestionSection(true);
      } else {
        const errorData = await response.json();
        setErrorMessage(errorData.message || 'Error processing PDF');
      }
    } catch (error) {
      console.error("Error processing PDF:", error);
      setErrorMessage('Network error, please try again later');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuestionChange = (event) => {
    setQuestion(event.target.value);
  };

  const handleAskQuestion = async () => {
    setIsGettingAnswer(true);
    const requestBody = {
      question,
      fileName: selectedFile.name,
    };

    try {
      const response = await fetch(API_BASE_URL+'/ask-question', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (response.ok) {
        const data = await response.json();
        setResponseMessage(data.answer);
      } else {
        setResponseMessage('Error getting the answer. Please try again.');
      }
    } catch (error) {
      console.error("Error asking question:", error);
      setResponseMessage('Error getting the answer. Please try again.');
    } finally {
      setIsGettingAnswer(false);
      setAskAnswerVisible(true);
    }
  };

  return (
    <Box
      className="App"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      padding="20px"
      background="#f7f7f7"
    >
      <Typography variant="h4" gutterBottom>
        ChatPDF.AI
      </Typography>
      {!selectedFile ? (
        <UploadButton onDrop={handleFileDrop} />
      ) : (
        <Typography variant="body1" style={{ marginBottom: '20px' }}>
          Selected File: {selectedFile.name}
        </Typography>
      )}
      {selectedFile && !isProcessing && (
        <div style={{ marginBottom: '20px' }}>
          <Button variant="outlined" color="secondary" onClick={handleCancelUpload} style={{ margin: '10px 0' }}>
            Change File
          </Button>
          <Button variant="contained" color="primary" onClick={handleProcess}>
            Process
          </Button>
        </div>
      )}
      {isProcessing && <Typography variant="h6">Processing...</Typography>}
      {errorMessage && <Typography variant="body1" color="error" style={{ marginBottom: '20px' }}>{errorMessage}</Typography>}
      {showQuestionSection && (
      <div style={{ width: '80%', maxWidth: '400px', marginTop: '20px' }}>
          <TextField
            label="Ask a question"
            variant="outlined"
            fullWidth
            value={question}
            onChange={handleQuestionChange}
            style={{ marginBottom: '20px' }}
          />
          <Button variant="contained" color="primary" fullWidth onClick={handleAskQuestion}>
            Get Answer
          </Button>
        </div>
      )}
      {isGettingAnswer && <Typography variant="h6">Getting your answer...</Typography>}
      {responseMessage && (
        <Typography variant="body1" style={{ marginTop: '20px' }}>
          Response: {responseMessage}
        </Typography>
      )}
    </Box>
  );
};

export default App;
