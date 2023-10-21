from fastapi import FastAPI, File, UploadFile, HTTPException, APIRouter, Form
import os
import io
import pickle
from dotenv import load_dotenv
from models import QuestionRequest
from PyPDF2 import PdfReader
from langchain.text_splitter import CharacterTextSplitter
from langchain.embeddings import HuggingFaceInstructEmbeddings
from langchain.vectorstores import faiss
from langchain.llms import huggingface_hub
from langchain.chains.question_answering import load_qa_chain

router = APIRouter()
load_dotenv()

def get_pdf_text(pdf_doc):
    text = ""
    pdf_reader = PdfReader(pdf_doc)
    for page in pdf_reader.pages:
        text += page.extract_text()
    return text

def get_text_chunks(raw_text):
    text_splitter = CharacterTextSplitter(
        separator="\n",
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.split_text(raw_text)
    return chunks

def get_vectorstore(text_chunks):
    embeddings = HuggingFaceInstructEmbeddings(model_name = 'hkunlp/instructor-xl')
    vectorstore = faiss.FAISS.from_texts(texts=text_chunks, embedding=embeddings)
    return vectorstore

def get_answer(vectorstore, user_question):
    docs = vectorstore.similarity_search(query=user_question, k=3)
    llm = huggingface_hub.HuggingFaceHub(repo_id='google/flan-t5-xxl', model_kwargs={"temperature":0.5, "max_length":512})
    chain = load_qa_chain(llm=llm, chain_type='stuff')
    response = chain.run(input_documents=docs, question=user_question)
    return response

@router.post("/embed-and-vectorize")
async def embed_and_vectorize(pdf_file: UploadFile = File(...), file_name: str = Form(...)):
    try:
        # Read the content of the UploadFile into a BytesIO object
        store_name = file_name[:-4]
        
        pdf_bytes = await pdf_file.read()
        pdf_io = io.BytesIO(pdf_bytes)
        
        # Get pdf text
        pdf_text = get_pdf_text(pdf_io)

        # Get pdf chunks
        text_chunks = get_text_chunks(pdf_text)

        if not os.path.exists(f"{store_name}.pkl"):
            vectorstore = get_vectorstore(text_chunks)
            with open(f"{store_name}.pkl", "wb") as f:
                pickle.dump(vectorstore, f)
    
    except Exception as e:
        # Handle errors and return an HTTPException with 500 Internal Server Error status code
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
    

@router.post("/ask-question")
async def ask_question(question_data: QuestionRequest):
    load_dotenv()
    try:
        global store_name
        user_question = question_data.question
        store_name = question_data.fileName
        with open(f"{store_name[:-4]}.pkl", "rb") as f:
            vectorstore = pickle.load(f)
        
        if user_question:
            response = get_answer(vectorstore, user_question)
        
        return {"answer": response}
    
    except Exception as e:
        # Handle errors and return an HTTPException with 500 Internal Server Error status code
        raise HTTPException(status_code=500, detail=f"Error processing question: {str(e)}")