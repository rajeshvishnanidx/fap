# AI Agent Dashboard

A powerful platform for creating and managing AI-powered chat agents with customizable interfaces and knowledge base management.

## Features

- Create and manage multiple AI chat agents
- Customize agent appearance (colors, icons, position)
- Set agent behavior and tone of voice
- Build knowledge base through:
  - Website scraping
  - File uploads (PDF, DOC, TXT)
- Preview agents before deployment
- Generate embeddable widget code
- Secure API key management
- Vector embeddings for improved responses
- Dark/Light theme support

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- OpenAI API key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-agent-dashboard
```

2. Install dependencies for both client and server:
```bash
# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install
```

3. Create a `.env` file in the server directory:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

4. Create a `.env` file in the client directory:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Running the Application

1. Start the server:
```bash
cd server
npm run dev
```

2. Start the client:
```bash
cd client
npm start
```

The application will be available at `http://localhost:3000`

## Widget Integration

To integrate the chat widget into your website, add the following code:

```html
<script>
  (function(w,d,s,o,f,js,fjs){
    w['AI-Agent-Widget']=o;w[o]=w[o]||function(){
    (w[o].q=w[o].q||[]).push(arguments)};js=d.createElement(s),
    fjs=d.getElementsByTagName(s)[0];js.id=o;js.src=f;js.async=1;
    fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','aiagent','https://your-domain.com/widget.js'));
  aiagent('init', 'YOUR_AGENT_ID', 'YOUR_API_KEY');
</script>
```

Replace `YOUR_AGENT_ID` and `YOUR_API_KEY` with the values from your dashboard.

## API Documentation

### Authentication

- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/me` - Get current user
- PUT `/api/auth/openai-key` - Update OpenAI API key

### Agents

- POST `/api/agents` - Create new agent
- GET `/api/agents` - Get all agents
- GET `/api/agents/:id` - Get single agent
- PUT `/api/agents/:id` - Update agent
- DELETE `/api/agents/:id` - Delete agent

### Knowledge Base

- POST `/api/knowledge-base/scrape` - Scrape website content
- POST `/api/knowledge-base/process-file` - Process uploaded file
- GET `/api/knowledge-base/agent/:agentId` - Get knowledge base items
- DELETE `/api/knowledge-base/:itemId/agent/:agentId` - Delete knowledge base item

## Security

- JWT authentication for API endpoints
- API key required for widget integration
- Separate OpenAI API keys per customer
- Secure storage of sensitive information

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. #   f a p  
 