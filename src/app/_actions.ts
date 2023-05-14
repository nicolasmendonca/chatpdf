"use server";

import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { PDFLoader } from "langchain/document_loaders/fs/pdf";
import { PineconeClient } from "@pinecone-database/pinecone";
import { PineconeStore } from "langchain/vectorstores/pinecone";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { VectorDBQAChain } from "langchain/chains";
import { OpenAI } from "langchain/llms/openai";
// import { ChatOpenAI } from "langchain/chat_models/openai";
// import { loadSummarizationChain } from "langchain/chains";
// import { loadQAStuffChain, loadQAMapReduceChain } from "langchain/chains";
// import { PromptTemplate } from "langchain/prompts";
// import { LLMChain } from "langchain/chains";

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
    batchSize: 3,
  });

  // Initialize the store
  const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
  });

  // Initialize OpenAI LLM
  const model = new OpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY!,
    modelName: "gpt-3.5-turbo",
    temperature: 1,
    verbose: true,
  });

  // Approach 2: Build a custom template
  //   const documents = await vectorStore.similaritySearch(question, 3);

  //   const prompt = PromptTemplate.fromTemplate(`
  // Given the following context, answer the question above. Be as extensive and detailed as you can with the response:

  // ---
  // Context:
  // {context}
  // ---

  // Question: {question}
  // Answer:`);

  // const chain = new LLMChain({ llm: model, prompt });
  // const response = await chain.call({
  //   context: documents.map((doc) => doc.pageContent),
  //   question,
  // });

  // Initialize the chain
  const chain = VectorDBQAChain.fromLLM(model, vectorStore, {
    k: 3,
    verbose: true,
  });

  // Ask the question
  const response = await chain.call({ query: question });
  return {
    message: response.text,
  };
}
