-include .env

# Default RPC URL if not set in environment
POLYGON_AMOY_RPC_URL ?= https://rpc-amoy.polygon.technology

# Add these variables at the top of your Makefile, after the existing ones
ANVIL_RPC_URL ?= http://127.0.0.1:8545
ANVIL_PRIVATE_KEY ?= 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

.PHONY: all test clean deploy copy-abi verify-env update-env-nft update-env-marketplace deploy-local verify-env-local

all: clean install build

# Clean the repo
clean:
	forge clean

# Install dependencies
install:
	forge install OpenZeppelin/openzeppelin-contracts

# Build the project
build:
	forge build

# Run tests
test:
	forge test

# Verify environment variables
verify-env:
	@if [ -z "$(PRIVATE_KEY)" ]; then \
		echo "Error: PRIVATE_KEY is not set in .env file"; \
		exit 1; \
	fi
	@if [ -z "$(POLYGON_AMOY_RPC_URL)" ]; then \
		echo "Error: POLYGON_AMOY_RPC_URL is not set in .env file"; \
		exit 1; \
	fi

# Strip 0x prefix if present and export
CLEAN_PK = $(subst 0x,,$(PRIVATE_KEY))

# Update .env file with new NFT contract address
update-env-nft:
	@if [ ! -z "$(NEW_NFT_ADDRESS)" ]; then \
		echo "Updating NFT_CONTRACT_ADDRESS in .env file..."; \
		echo "POLYGON_AMOY_RPC_URL=$(POLYGON_AMOY_RPC_URL)" > .env.tmp && \
		echo "POLYGONSCAN_API_KEY=$(POLYGONSCAN_API_KEY)" >> .env.tmp && \
		echo "PRIVATE_KEY=$(PRIVATE_KEY)" >> .env.tmp && \
		echo "NFT_CONTRACT_ADDRESS=$(NEW_NFT_ADDRESS)" >> .env.tmp && \
		echo "MARKETPLACE_CONTRACT_ADDRESS=$(MARKETPLACE_CONTRACT_ADDRESS)" >> .env.tmp && \
		mv .env.tmp .env; \
	fi

# Update .env file with new Marketplace contract address
update-env-marketplace:
	@if [ ! -z "$(NEW_MARKETPLACE_ADDRESS)" ]; then \
		echo "Updating MARKETPLACE_CONTRACT_ADDRESS in .env file..."; \
		echo "POLYGON_AMOY_RPC_URL=$(POLYGON_AMOY_RPC_URL)" > .env.tmp && \
		echo "POLYGONSCAN_API_KEY=$(POLYGONSCAN_API_KEY)" >> .env.tmp && \
		echo "PRIVATE_KEY=$(PRIVATE_KEY)" >> .env.tmp && \
		echo "NFT_CONTRACT_ADDRESS=$(NFT_CONTRACT_ADDRESS)" >> .env.tmp && \
		echo "MARKETPLACE_CONTRACT_ADDRESS=$(NEW_MARKETPLACE_ADDRESS)" >> .env.tmp && \
		mv .env.tmp .env; \
	fi

# Deploy both contracts
deploy: verify-env
	@echo "Deploying to Polygon Amoy..."
	@echo "Using private key (redacted for security, length: $(shell echo $(PRIVATE_KEY) | wc -c) characters)"
	
	@echo "Deploying NFT contract..."
	@forge script script/DeployNFT.s.sol:DeployNFT \
		--rpc-url "$(POLYGON_AMOY_RPC_URL)" \
		--private-key "$(PRIVATE_KEY)" \
		--broadcast \
		-vvvv \
		| tee deploy_nft_output.txt
	
	@if grep -q "== Logs ==" deploy_nft_output.txt; then \
		NEW_NFT_ADDRESS=$$(grep -A1 "== Logs ==" deploy_nft_output.txt | tail -n1 | awk '{print $$NF}') && \
		echo "\nNFT deployment successful!" && \
		echo "NFT contract address: $$NEW_NFT_ADDRESS" && \
		sed -i.bak '/^NFT_CONTRACT_ADDRESS=/d' .env && \
		echo "NFT_CONTRACT_ADDRESS=$$NEW_NFT_ADDRESS" >> .env && \
		rm -f .env.bak; \
	else \
		echo "NFT deployment failed!" && \
		rm -f deploy_nft_output.txt && \
		exit 1; \
	fi
	
	@echo "Deploying Marketplace contract..."
	@forge script script/DeployMarketplace.s.sol:DeployMarketplace \
		--rpc-url "$(POLYGON_AMOY_RPC_URL)" \
		--private-key "$(PRIVATE_KEY)" \
		--broadcast \
		-vvvv \
		| tee deploy_marketplace_output.txt
	
	@if grep -q "== Logs ==" deploy_marketplace_output.txt; then \
		NEW_MARKETPLACE_ADDRESS=$$(grep -A1 "== Logs ==" deploy_marketplace_output.txt | tail -n1 | awk '{print $$NF}') && \
		echo "\nMarketplace deployment successful!" && \
		echo "Marketplace contract address: $$NEW_MARKETPLACE_ADDRESS" && \
		sed -i.bak '/^MARKETPLACE_CONTRACT_ADDRESS=/d' .env && \
		echo "MARKETPLACE_CONTRACT_ADDRESS=$$NEW_MARKETPLACE_ADDRESS" >> .env && \
		rm -f .env.bak && \
		npm run copy-abi; \
	else \
		echo "Marketplace deployment failed!" && \
		rm -f deploy_marketplace_output.txt && \
		exit 1; \
	fi
	
	@rm -f deploy_nft_output.txt deploy_marketplace_output.txt

	@echo "\nDeployment Complete!"
	@echo "Contract Addresses:"
	@grep "NFT_CONTRACT_ADDRESS\|MARKETPLACE_CONTRACT_ADDRESS" .env

# Copy ABI to frontend
copy-abi:
	@echo "Copying ABI with NFT address: $(NFT_CONTRACT_ADDRESS) and Marketplace address: $(MARKETPLACE_CONTRACT_ADDRESS)"
	npm run copy-abi

# Helper target to show current addresses
show-addresses:
	@echo "Current NFT contract address: $(NFT_CONTRACT_ADDRESS)"
	@echo "Current Marketplace contract address: $(MARKETPLACE_CONTRACT_ADDRESS)"

# Helper target to show deployment info
deployment-info:
	@echo "Current configuration:"
	@echo "RPC URL: $(POLYGON_AMOY_RPC_URL)"
	@echo "Private key length: $(shell echo $(CLEAN_PK) | wc -c) characters"
	@echo "Current NFT contract address: $(NFT_CONTRACT_ADDRESS)"
	@echo "Current Marketplace contract address: $(MARKETPLACE_CONTRACT_ADDRESS)"

# Deploy using the local target
deploy-local: verify-env-local
	@echo "Deploying to Local Anvil Network..."
	@echo "Using private key (redacted for security, length: $(shell echo $(ANVIL_PRIVATE_KEY) | wc -c) characters)"
	
	@echo "Deploying NFT contract..."
	@forge script script/DeployNFT.s.sol:DeployNFT \
		--rpc-url "$(ANVIL_RPC_URL)" \
		--private-key "$(ANVIL_PRIVATE_KEY)" \
		--broadcast \
		-vvvv \
		| tee deploy_nft_output.txt
	
	@if grep -q "== Logs ==" deploy_nft_output.txt; then \
		NEW_NFT_ADDRESS=$$(grep -A1 "== Logs ==" deploy_nft_output.txt | tail -n1 | awk '{print $$NF}') && \
		echo "\nNFT deployment successful!" && \
		echo "NFT contract address: $$NEW_NFT_ADDRESS" && \
		sed -i.bak '/^NFT_CONTRACT_ADDRESS=/d' .env && \
		echo "NFT_CONTRACT_ADDRESS=$$NEW_NFT_ADDRESS" >> .env && \
		rm -f .env.bak; \
	else \
		echo "NFT deployment failed!" && \
		rm -f deploy_nft_output.txt && \
		exit 1; \
	fi
	
	@echo "Deploying Marketplace contract..."
	@forge script script/DeployMarketplace.s.sol:DeployMarketplace \
		--rpc-url "$(ANVIL_RPC_URL)" \
		--private-key "$(ANVIL_PRIVATE_KEY)" \
		--broadcast \
		-vvvv \
		| tee deploy_marketplace_output.txt
	
	@if grep -q "== Logs ==" deploy_marketplace_output.txt; then \
		NEW_MARKETPLACE_ADDRESS=$$(grep -A1 "== Logs ==" deploy_marketplace_output.txt | tail -n1 | awk '{print $$NF}') && \
		echo "\nMarketplace deployment successful!" && \
		echo "Marketplace contract address: $$NEW_MARKETPLACE_ADDRESS" && \
		sed -i.bak '/^MARKETPLACE_CONTRACT_ADDRESS=/d' .env && \
		echo "MARKETPLACE_CONTRACT_ADDRESS=$$NEW_MARKETPLACE_ADDRESS" >> .env && \
		rm -f .env.bak && \
		npm run copy-abi; \
	else \
		echo "Marketplace deployment failed!" && \
		rm -f deploy_marketplace_output.txt && \
		exit 1; \
	fi
	
	@rm -f deploy_nft_output.txt deploy_marketplace_output.txt

	@echo "\nDeployment Complete!"
	@echo "Contract Addresses:"
	@grep "NFT_CONTRACT_ADDRESS\|MARKETPLACE_CONTRACT_ADDRESS" .env

# Add this verification target for local deployment
verify-env-local:
	@echo "Using Anvil configuration"

# Clean DB data using cleanCollections script
clean-db:
	@echo "Cleaning MongoDB collections data..."
	@cd ../nft-marketplace && node src/scripts/cleanCollections.js
# New target for deploy with DB cleanup
deploy-clean-db: deploy clean-db