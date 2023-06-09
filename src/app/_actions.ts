"use server";

import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { PineconeClient } from "@pinecone-database/pinecone";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { VectorDBQAChain } from "langchain/chains";
import { ChatOpenAI } from "langchain/chat_models/openai";

export async function handleUploadPdf(formData: FormData) {
  try {
    const pdfFile = formData.get("pdfFile") as File;

    // First we load the PDF file and transform it to documents
    const loader = new PDFLoader(pdfFile);
    const docs = await loader.load();

    // Then we split the document to chunks with X number of characters
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    });
    const splittedDocs = await textSplitter.splitDocuments(docs);

    // Init the pinecone index
    const pineconeClient = new PineconeClient();
    await pineconeClient.init({
      apiKey: process.env.PINECONE_API_KEY!,
      environment: process.env.PINECONE_ENVIRONMENT!,
    });
    const index = await pineconeClient.Index("chatpdf");

    // Init the embeddings engine
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY!,
    });

    // Create the index
    await PineconeStore.fromDocuments(splittedDocs, embeddings, {
      pineconeIndex: index,
    });

    return {
      message: "Success",
    };
  } catch (e) {
    return {
      message: e instanceof Error ? e.message : `Something went wrong: ${e}`,
    };
  }
}

export async function askQuestion(
  formData: FormData
): Promise<{ message: string }> {
  const question = formData.get("question") as string;

  // Init pinecone again
  const pineconeClient = new PineconeClient();
  await pineconeClient.init({
    apiKey: process.env.PINECONE_API_KEY!,
    environment: process.env.PINECONE_ENVIRONMENT!,
  });

  // Get the index
  const index = await pineconeClient.Index("chatpdf");

  // Initialize embeddings engine
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    batchSize: 2,
  });

  // Initialize the store
  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
  });

  // Initialize OpenAI LLM
  const model = new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    verbose: true,
  });

  // Initialize the chain
  const chain = VectorDBQAChain.fromLLM(model, vectorStore, {
    k: 2,
    verbose: true,
  });

  // Ask the question
  const response = await chain.call({ query: question });
  return {
    message: response.text,
  };
}
