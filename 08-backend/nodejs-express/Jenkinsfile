pipeline {
    agent any

    environment {
        GIT_BRANCH = 'main'
        TRIVY_DISABLE_VEX_NOTICE = 'true'
        GITHUB_TOKEN = credentials('GHP_TOKEN')
    }

    stages {
        stage('Init') {
            steps {
                script {
                    sh '''
                     echo "Start building docker image for stears backend service..."
                    '''
                    sh '''
                        COMMIT_SHA=$(git rev-parse HEAD)
                        curl -s -X POST \
                            -H "Authorization: token $GITHUB_TOKEN" \
                            -H "Content-Type: application/json" \
                            -d '{"state": "pending", "description": "Build in progress", "context": "jenkins/ci"}' \
                            https://api.github.com/repos/karosi12/stears-be/statuses/$COMMIT_SHA
                    '''
                }
            }
        }
        stage('Clone Repo') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'github-pat',
                    usernameVariable: 'GIT_USERNAME',
                    passwordVariable: 'GIT_PASSWORD'
                )]) {
                    script {
                        sh '''
                        rm -rf stears-be || true
                        git clone --branch $GIT_BRANCH https://$GIT_USERNAME:$GIT_PASSWORD@github.com/karosi12/stears-be.git
                        cd stears-be && npm ci --legacy-peer-deps 
                        echo "Repository cloned and dependencies installed."
                        '''
                    }
                }
            }
        }

        stage('Format Codebase') {
            steps {
                dir('stears-be') {
                    sh '''
                        npm run format
                        echo "Format completed successfully."
                    '''
                }
            }
        }

        stage('Lint Codebase') {
            steps {
                dir('stears-be') {
                    sh '''
                        npm run lint
                        echo "Linting completed successfully."
                    '''
                }
            }
        }

        stage('Integration test') {
            steps {
                dir('stears-be') {
                    sh '''
                        npm run test:integration
                        echo "Integration test completed successfully."
                    '''
                }
            }
        }

        stage('Unit test') {
            steps {
                dir('stears-be') {
                    sh '''
                        npm run test:unit
                        echo "Unit test completed successfully."
                    '''
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                dir('stears-be') {
                    sh '''
                        docker build -t crud:latest .
                        echo "Docker image built successfully: crud:latest"
                    '''
                }
            }
        }

        stage('Security Scan - Trivy') {
            steps {
                sh '''
                    echo "Running Trivy vulnerability scan...(CRITICAL severity will fail the build)"
                    trivy image --exit-code 1 --severity CRITICAL --ignore-unfixed crud:latest
                '''
            }
        }

        stage('Push Docker Image to GHCR') {
            when {
                expression { currentBuild.result == null || currentBuild.result == 'SUCCESS' }
            }
            steps {
                sh '''
                    export COMMIT_SHA=$(git rev-parse --short HEAD)
                    docker tag crud:latest ghcr.io/karosi12/stears-be:${COMMIT_SHA}
                    echo $GITHUB_TOKEN | docker login ghcr.io -u karosi12 --password-stdin
                    docker push ghcr.io/karosi12/stears-be:${COMMIT_SHA}
                    docker logout ghcr.io
                    echo "Docker image pushed: ghcr.io/karosi12/stears-be:${COMMIT_SHA}"
                '''
            }
        }
        stage('Cleanup') {
            steps {
                sh '''
                    export COMMIT_SHA=$(git rev-parse --short HEAD)
                    docker rmi crud:latest || true
                    docker rmi ghcr.io/karosi12/stears-be:${COMMIT_SHA} || true
                    docker images
                    rm -rf stears-be || true
                    echo "Cleanup completed."
                '''
            }
        } 
    }
    post {
        failure {
            echo "❌ Build failed. Review Trivy results for vulnerabilities."
            sh '''
                COMMIT_SHA=$(git rev-parse HEAD)
                curl -s -X POST \
                -H "Authorization: token $GITHUB_TOKEN" \
                -H "Content-Type: application/json" \
                -d '{"state": "failure", "description": "Build failed", "context": "jenkins/ci"}' \
                https://api.github.com/repos/karosi12/stears-be/statuses/$COMMIT_SHA
            '''
        }
        success {
            echo "✅ Build passed. No high/critical vulnerabilities found."
            sh '''
                COMMIT_SHA=$(git rev-parse HEAD)
                curl -s -X POST \
                -H "Authorization: token $GITHUB_TOKEN" \
                -H "Content-Type: application/json" \
                -d '{"state": "success", "description": "Build passed", "context": "jenkins/ci"}' \
                https://api.github.com/repos/karosi12/stears-be/statuses/$COMMIT_SHA
            '''
        }
    }
}
