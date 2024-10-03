// TODO: Separate into multiple contexts, keeping simple for now

"use client"

import { ChatbotUIContext } from "@/context/context"
import { getProfileByUserId } from "@/db/profile"
import { getWorkspaceImageFromStorage } from "@/db/storage/workspace-images"
import { getWorkspacesByUserId } from "@/db/workspaces"
import { convertBlobToBase64 } from "@/lib/blob-to-b64"
import {
  fetchHostedModels,
  fetchOllamaModels,
  fetchOpenRouterModels
} from "@/lib/models/fetch-models"
import { supabase } from "@/lib/supabase/browser-client"
import { Tables } from "@/supabase/types"
import {
  ChatFile,
  ChatMessage,
  ChatSettings,
  LLM,
  MessageImage,
  OpenRouterLLM,
  WorkspaceImage
} from "@/types"
import { AssistantImage } from "@/types/images/assistant-image"
import { VALID_ENV_KEYS } from "@/types/valid-keys"
import { log } from "console"
import { useRouter } from "next/navigation"
import { FC, useEffect, useState } from "react"

interface GlobalStateProps {
  children: React.ReactNode
}

export const GlobalState: FC<GlobalStateProps> = ({ children }) => {
  const router = useRouter()

  // PROFILE STORE
  // const [profile, setProfile] = useState<Tables<"profiles"> | null>(null)
  const [profile, setProfile] = useState<null>(null)

  // ITEMS STORE
  const [assistants, setAssistants] = useState<Tables<"assistants">[]>([])
  const [collections, setCollections] = useState<Tables<"collections">[]>([])
  const [chats, setChats] = useState<Tables<"chats">[]>([])
  const [files, setFiles] = useState<Tables<"files">[]>([])
  const [folders, setFolders] = useState<Tables<"folders">[]>([])
  const [models, setModels] = useState<Tables<"models">[]>([])
  const [presets, setPresets] = useState<Tables<"presets">[]>([])
  const [prompts, setPrompts] = useState<Tables<"prompts">[]>([])
  const [tools, setTools] = useState<Tables<"tools">[]>([])
  //const [workspaces, setWorkspaces] = useState<Tables<"workspaces">[]>([])*/

  //const [assistants, setAssistants] = useState<null>(null)
  //const [collections, setCollections] = useState<null>(null)
  //const [chats, setChats] = useState<null>(null)
  //const [files, setFiles] = useState<null>(null)
  //const [folders, setFolders] = useState<null>(null)
  //const [models, setModels] = useState<null>(null)
  //const [presets, setPresets] = useState<null>(null)
  //const [prompts, setPrompts] = useState<null>(null)
  //const [tools, setTools] = useState<null>(null)
  const [workspaces, setWorkspaces] = useState<{
    id: "f6a7efa0-7d52-455a-84fc-22a2962e2578"
    user_id: "58b0ff00-28f8-4256-a129-059a13949747"
    created_at: "2024-10-03T00:37:41.013178+00:00"
    updated_at: null
    sharing: "private"
    default_context_length: 4096
    default_model: "gpt-4-turbo-preview"
    default_prompt: "You are a friendly, helpful AI assistant."
    default_temperature: 0.5
    description: "My home workspace."
    embeddings_provider: "openai"
    include_profile_context: true
    include_workspace_instructions: true
    instructions: ""
    is_home: true
    name: "Home"
    image_path: ""
  }>([])

  console.log("folders")
  Object.entries(folders).forEach(([key, value]) => {
    console.log(value)
  })

  /*   console.log('Profile' + profile)
  console.log('Assitants' + assistants)
  console.log('Collections' + collections)
  console.log('Chats' +chats)
  console.log('Files' + files)
  console.log('Folders' + folders)
  console.log('Models' + models)
  console.log('Presets' + presets)
  console.log('tools' + tools)
  console.log('workspaces' + workspaces) */

  // MODELS STORE
  const [envKeyMap, setEnvKeyMap] = useState<Record<string, VALID_ENV_KEYS>>({})
  const [availableHostedModels, setAvailableHostedModels] = useState<LLM[]>([])
  const [availableLocalModels, setAvailableLocalModels] = useState<LLM[]>([])
  const [availableOpenRouterModels, setAvailableOpenRouterModels] = useState<
    OpenRouterLLM[]
  >([])

  // WORKSPACE STORE
  const [selectedWorkspace, setSelectedWorkspace] =
    useState<Tables<"workspaces"> | null>(null)
  const [workspaceImages, setWorkspaceImages] = useState<WorkspaceImage[]>([])

  // PRESET STORE
  const [selectedPreset, setSelectedPreset] =
    useState<Tables<"presets"> | null>(null)

  // ASSISTANT STORE
  const [selectedAssistant, setSelectedAssistant] =
    useState<Tables<"assistants"> | null>(null)
  const [assistantImages, setAssistantImages] = useState<AssistantImage[]>([])
  const [openaiAssistants, setOpenaiAssistants] = useState<any[]>([])

  // PASSIVE CHAT STORE
  const [userInput, setUserInput] = useState<string>("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    model: "gpt-4-turbo-preview",
    prompt: "You are a helpful AI assistant.",
    temperature: 0.5,
    contextLength: 4000,
    includeProfileContext: true,
    includeWorkspaceInstructions: true,
    embeddingsProvider: "openai"
  })
  const [selectedChat, setSelectedChat] = useState<Tables<"chats"> | null>(null)
  const [chatFileItems, setChatFileItems] = useState<Tables<"file_items">[]>([])

  // ACTIVE CHAT STORE
  const [isGenerating, setIsGenerating] = useState<boolean>(false)
  const [firstTokenReceived, setFirstTokenReceived] = useState<boolean>(false)
  const [abortController, setAbortController] =
    useState<AbortController | null>(null)

  // CHAT INPUT COMMAND STORE
  const [isPromptPickerOpen, setIsPromptPickerOpen] = useState(false)
  const [slashCommand, setSlashCommand] = useState("")
  const [isFilePickerOpen, setIsFilePickerOpen] = useState(false)
  const [hashtagCommand, setHashtagCommand] = useState("")
  const [isToolPickerOpen, setIsToolPickerOpen] = useState(false)
  const [toolCommand, setToolCommand] = useState("")
  const [focusPrompt, setFocusPrompt] = useState(false)
  const [focusFile, setFocusFile] = useState(false)
  const [focusTool, setFocusTool] = useState(false)
  const [focusAssistant, setFocusAssistant] = useState(false)
  const [atCommand, setAtCommand] = useState("")
  const [isAssistantPickerOpen, setIsAssistantPickerOpen] = useState(false)

  // ATTACHMENTS STORE
  const [chatFiles, setChatFiles] = useState<ChatFile[]>([])
  const [chatImages, setChatImages] = useState<MessageImage[]>([])
  const [newMessageFiles, setNewMessageFiles] = useState<ChatFile[]>([])
  const [newMessageImages, setNewMessageImages] = useState<MessageImage[]>([])
  const [showFilesDisplay, setShowFilesDisplay] = useState<boolean>(false)

  // RETIEVAL STORE
  const [useRetrieval, setUseRetrieval] = useState<boolean>(true)
  const [sourceCount, setSourceCount] = useState<number>(4)

  // TOOL STORE
  const [selectedTools, setSelectedTools] = useState<Tables<"tools">[]>([])
  const [toolInUse, setToolInUse] = useState<string>("none")

  useEffect(() => {
    ;(async () => {
      const profile = await fetchStartingData()

      if (profile) {
        const hostedModelRes = await fetchHostedModels(profile)
        if (!hostedModelRes) return

        setEnvKeyMap(hostedModelRes.envKeyMap)
        setAvailableHostedModels(hostedModelRes.hostedModels)

        if (
          profile["openrouter_api_key"] ||
          hostedModelRes.envKeyMap["openrouter"]
        ) {
          const openRouterModels = await fetchOpenRouterModels()
          if (!openRouterModels) return
          setAvailableOpenRouterModels(openRouterModels)
        }
      }

      if (process.env.NEXT_PUBLIC_OLLAMA_URL) {
        const localModels = await fetchOllamaModels()
        if (!localModels) return
        setAvailableLocalModels(localModels)
      }
    })()
  }, [])

  const fetchStartingData = async () => {
    const session = (await supabase.auth.getSession()).data.session

    if (session) {
      const user = session.user

      const profile = await getProfileByUserId(user.id)
      setProfile(profile)

      if (!profile.has_onboarded) {
        return router.push("/setup")
      }

      const workspaces = await getWorkspacesByUserId(user.id)
      setWorkspaces(workspaces)

      for (const workspace of workspaces) {
        let workspaceImageUrl = ""

        if (workspace.image_path) {
          workspaceImageUrl =
            (await getWorkspaceImageFromStorage(workspace.image_path)) || ""
        }

        if (workspaceImageUrl) {
          const response = await fetch(workspaceImageUrl)
          const blob = await response.blob()
          const base64 = await convertBlobToBase64(blob)

          setWorkspaceImages(prev => [
            ...prev,
            {
              workspaceId: workspace.id,
              path: workspace.image_path,
              base64: base64,
              url: workspaceImageUrl
            }
          ])
        }
      }

      return profile
    }
  }

  return (
    <ChatbotUIContext.Provider
      value={{
        // PROFILE STORE
        profile,
        setProfile,

        // ITEMS STORE
        assistants,
        setAssistants,
        collections,
        setCollections,
        chats,
        setChats,
        files,
        setFiles,
        folders,
        setFolders,
        models,
        setModels,
        presets,
        setPresets,
        prompts,
        setPrompts,
        tools,
        setTools,
        workspaces,
        setWorkspaces,

        // MODELS STORE
        envKeyMap,
        setEnvKeyMap,
        availableHostedModels,
        setAvailableHostedModels,
        availableLocalModels,
        setAvailableLocalModels,
        availableOpenRouterModels,
        setAvailableOpenRouterModels,

        // WORKSPACE STORE
        selectedWorkspace,
        setSelectedWorkspace,
        workspaceImages,
        setWorkspaceImages,

        // PRESET STORE
        selectedPreset,
        setSelectedPreset,

        // ASSISTANT STORE
        selectedAssistant,
        setSelectedAssistant,
        assistantImages,
        setAssistantImages,
        openaiAssistants,
        setOpenaiAssistants,

        // PASSIVE CHAT STORE
        userInput,
        setUserInput,
        chatMessages,
        setChatMessages,
        chatSettings,
        setChatSettings,
        selectedChat,
        setSelectedChat,
        chatFileItems,
        setChatFileItems,

        // ACTIVE CHAT STORE
        isGenerating,
        setIsGenerating,
        firstTokenReceived,
        setFirstTokenReceived,
        abortController,
        setAbortController,

        // CHAT INPUT COMMAND STORE
        isPromptPickerOpen,
        setIsPromptPickerOpen,
        slashCommand,
        setSlashCommand,
        isFilePickerOpen,
        setIsFilePickerOpen,
        hashtagCommand,
        setHashtagCommand,
        isToolPickerOpen,
        setIsToolPickerOpen,
        toolCommand,
        setToolCommand,
        focusPrompt,
        setFocusPrompt,
        focusFile,
        setFocusFile,
        focusTool,
        setFocusTool,
        focusAssistant,
        setFocusAssistant,
        atCommand,
        setAtCommand,
        isAssistantPickerOpen,
        setIsAssistantPickerOpen,

        // ATTACHMENT STORE
        chatFiles,
        setChatFiles,
        chatImages,
        setChatImages,
        newMessageFiles,
        setNewMessageFiles,
        newMessageImages,
        setNewMessageImages,
        showFilesDisplay,
        setShowFilesDisplay,

        // RETRIEVAL STORE
        useRetrieval,
        setUseRetrieval,
        sourceCount,
        setSourceCount,

        // TOOL STORE
        selectedTools,
        setSelectedTools,
        toolInUse,
        setToolInUse
      }}
    >
      {children}
    </ChatbotUIContext.Provider>
  )
}
