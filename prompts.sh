# Prompts Creation Script                     
# This script creates various prompts                              
# example Usage:
# 1. Right-click the folder containing this script
# 2. Select "Open Git Bash here"
# 3. Run: ./prompts.sh

# Configuration
# Replace {backend} with your backends base url (e.g., https://my.backend.service.azurewebsites.net)                                                                    
API_BASE_URL="{my base url}"
# Replace with your registered account credentials (the account you regesterd on the website)                              
EMAIL="example@example.com"
PASSWORD="password"

# Output formatting
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

#handle errors
handle_error() {
    local prompt_name=$1
    local error_msg=$2
    echo -e "${RED}Error creating prompt '${prompt_name}': ${error_msg}${NC}"
    read -p "Press Enter to exit..."
    exit 1
}

#show success
show_success() {
    local prompt_name=$1
    echo -e "${GREEN}Successfully created prompt '${prompt_name}'${NC}"
}

# Login and get bearer token
# -k to skip certificate checks (insecure)                                          
echo "Attempting to login..."
LOGIN_RESPONSE=$(curl -k --silent --show-error --fail --request POST \
    --url "${API_BASE_URL}/login" \
    --header 'Content-Type: application/json' \
    --data "{
        \"email\": \"${EMAIL}\",
        \"password\": \"${PASSWORD}\"
    }" 2>&1)
    
# Store the curl exit status
curl_status=$?
# Store the full response/error
full_response="${LOGIN_RESPONSE}"
# Check if curl command failed
if [ $? -ne 0 ]; then
    echo -e "${RED}Curl error during login: ${LOGIN_RESPONSE}${NC}"
    read -p "Press Enter to exit..."
    exit 1
fi

# Extract bearer token from response using grep and cut
BEARER_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$BEARER_TOKEN" ]; then
    echo -e "${RED}Failed to get bearer token from login response${NC}"
    echo -e "${RED}Response was: ${LOGIN_RESPONSE}${NC}"
    read -p "Press Enter to exit..."
    exit 1
fi

echo -e "${GREEN}Successfully Obtained Bearer token${NC}"

#create prompts
create_prompt() {
    local prompt_name=$1
    local data=$2
    
    echo "Creating prompt '${prompt_name}'..."
    # -k to skip certificate checks (insecure)                                          
    PROMPT_RESPONSE=$(curl -k --silent --show-error --fail -X POST "${API_BASE_URL}/create_prompt" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer ${BEARER_TOKEN}" \
        --data-raw "${data}" 2>&1)
        
    # Store the curl exit status
    local curl_status=$?
    # Store the full response/error
    local full_response="${PROMPT_RESPONSE}"                                                    
    # Check if curl command failed and format the error message
    if [ $curl_status -ne 0 ]; then
        # Remove the "curl: " prefix if it exists
        local error_msg=$(echo "$full_response" | sed 's/^curl: //')
        handle_error "${prompt_name}" "Curl error: ${error_msg}"
    fi
    
    # Check for API errors                      
    if [[ $PROMPT_RESPONSE == *"error"* ]] || [ -z "$PROMPT_RESPONSE" ]; then
        handle_error "${prompt_name}" "API error: ${PROMPT_RESPONSE}"
    fi
    
    show_success "${prompt_name}"
    sleep 1
}

# Create CP Stat Visit prompt
create_prompt "Social Worker - Children - CP Stat Visit" '{
    "name": "Social Worker - Children",
    "subcategories": {
        "CP Stat Visit": {
            "instruction": "You are an AI assistant designed to help adult social care workers evaluate the progress of their service users.",
            "task": "Your task is to analyze the transcript of the visit and produce a **CS Child Protection Statutory Visit** that includes:",
            "details": "- **Name of Social Worker**: The name of the Social Worker conducting the visit.\n - **Who was present at the home**: The names of those present during the visit (e.g. parents, friends, siblings, relatives).\n - **Observation**: Observations of how the child interacts with others present.\n - **Record of Meeting**: A detailed record of the key points covered during the visit.\n - **Analysis**: Analysis of the visit and list the issues requiring action.",
            "notes": "Ensure the summary is supportive, constructive, and professional.\n **Do NOT include any factual information that was not provided in the prompt context.**\n **If no information is available for any section, display '\''No Information Provided'\''.**"
        }
    }
}'

# Create CS LAC Stat Visit prompt
create_prompt "Social Worker - Children - CS LAC Stat Visit" '{
    "name": "Social Worker - Children",
    "subcategories": {
        "CS LAC Stat Visit": {
            "instruction": "You are an AI assistant designed to help adult social care workers evaluate the progress of their service users.",
            "task": "Your task is to analyze the transcript of the visit and produce a **CS LAC Statutory Visit** that includes:",
            "details": "- **Name of Social Worker**: The name of the Social Worker conducting the visit.\n - **Who was present at the home**: The names of the present during the visit (e.g. parents, friends, siblings, relatives).\n - **Summary of the Discussion with the Child/Young Person, including his/her wishes and feelings**: Provide a detailed summary of the discussion with the Child/Young Person, including his/her wishes and feelings.\n - **Should any changes be made to the arrangements for the Child/Young Person'\''s Health Care?**: Should any changes be made to the arrangements for the Child/Young Person'\''s Health Care?\n - **Should any changes be made to the arrangements for the Child/Young Person'\''s Education/Employment?**: Should any changes be made to the arrangements for the Child/Young Person'\''s Education/Employment?\n - **Should any changes be made to Contact arrangements?**: Should any changes be made to Contact arrangements?\n - **Have there been any developments or changes in Foster Family and the relationship with Carers (include comments on the standard of care being provided)**: Have there been any developments or changes in Foster Family and the relationship with Carers (include comments on the standard of care being provided).\n - **Summary of any Discussion with the Carer**: A detailed and full summary of any discussion with the carer.\n - **What else still needs to happen before the Plan for the Child/Young Person can be achieved**: What else still needs to happen before the Plan for the Child/Young Person can be achieved.\n - **Have all the issues requiring action from the previous visit been acted on**: Have all the issues requiring action from the previous visit been acted on.\n - **Details of next visit**: Interval and date.",
            "notes": "Ensure the summary is supportive, constructive, and professional.\n **Do NOT include any factual information that was not provided in the prompt context.**\n **If no information is available for any section, display '\''No Information Provided'\''.**"
        }
    }
}'

# Create Foster Carer Supervision prompt
create_prompt "Social Worker - Children - Foster Carer Supervision" '{
    "name": "Social Worker - Children",
    "subcategories": {
        "Foster Carer Supervision": {
            "instruction": "You are an AI assistant designed to help adult social care workers evaluate the progress of their service users.",
            "task": "Your task is to analyze the transcript of the visit and produce a **Foster Carer Supervision and Support Record** that includes:",
            "details": "- **Name of Social Worker**: The name of the Social Worker conducting the visit.\n - **Name of First Child**: The name of the first Foster Child discussed at the visit.\n - **Name of Second Child**: The name of the second Foster Child discussed at the visit.\n - **Foster Carer Wellbeing**: How are they doing? How is the family? A summary of the discussion regarding self-care strategies and support needs.\n - **Reflection**: What is working well? What are their areas of personal development, reflection, and any support needed.\n - **Review of action identified during last supervision**: Review of action identified during last supervision. Have they been completed or are further actions required?\n - **Learning and Development**: Are the carers aware of the national minimum requirements of 15 hours per year? Has each carer'\''s personal learning record and development plan been discussed, updated, evidenced, and signed off? Are there any additional training needs?\n - **Additional Support and Training**: Has any additional support or training been identified for the carers?\n - **Foster Carer Logs**: In line with the Recording Policy for foster carers, all foster carers should complete daily logs to keep an accurate record of the child or young person'\''s behaviors, any incidents, accidents, and for life journey work. These may be requested by Court and are required to safeguard themselves, particularly where there are allegations/injuries to children. Have these been completed?\n - **Finances**: What was discussed regarding carers'\'' finances, benefits, children'\''s pocket money, and savings. Was any additional support needed to help the carers with managing their money identified and discussed?\n - **Actions**: List all actions discussed, who they are assigned to, when they are expected to be completed by.\n - **Child 1 Health**: Detail all information about Child 1'\''s health.\n - **Child 1 Education/Training/Employment**: Detail all information related to Child 1'\''s education, training, and employment.\n - **Child 1 Emotional and Behavioral Development**: Provide details on Child 1'\''s emotional and behavioral development.\n - **Child 1 Identity**: Provide details on Child 1'\''s formation of an identity.\n - **Child 1 Contact**: Provide details of how Child 1 handles contact with others, including carers, family, friends, etc.\n - **Child 1 Social/Cultural Needs and Wellbeing, including social development**: Provide details of Child 1'\''s social/cultural needs and wellbeing, including social development.\n - **Child 1 Promoting Leisure Activities**: Provide details of promotion of leisure activities for Child 1.\n - **Child 1 Actions**: List any actions required that are specific to Child 1.",
            "notes": "Ensure the summary is supportive, constructive, and professional.\n **Do NOT include any factual information that was not provided in the prompt context.**\n **If no information is available for any section, display '\''No Information Provided'\''.**"
        }
    }
}'

# Create Fostering Record of Initial Visit prompt
create_prompt "Fostering Record of Initial Visit" '{
    "name": "Fostering Record of Initial Visit",
    "subcategories": {
        "Fostering Record of Initial Visit": {
            "instruction": "You are an AI assistant designed to help adult social care workers evaluate the progress of their service users.",
            "task": "Your task is to analyze the transcript of the visit and produce a **Fostering Record of Initial Visit** that includes:",
            "details": "- **Name of Social Worker**: The name of the Social Worker conducting the visit.\n - **Name of Applicants**: The name of the applicants at the visit.\n - **Marital Status**: The status of the applicants.\n - **Children**: The name and age of existing children.\n - **Employment History**: What is the current employment history of the applicants?\n - **Qualifications**: What is the current qualification of the applicants?\n - **Accommodation**: What is the current state of the accommodation of the applicants?\n - **Other Factors / Lifestyle / Pets**: What other details are discussed regarding lifestyle, pets, etc.?\n - **Family / Support Networks**: What family and support networks do the applicants have?\n - **Assessment Process**: Was the assessment process explained to the applicant? Detail any questions raised by the applicant and the answers provided by the Social Worker.\n - **DBS**: Does the applicant have a valid DBS check? If not, was the process explained to the applicant?\n - **References / CIW / Employer / Local Authority / School**: List all references, CIW, Employer, local authority, and school.\n - **Department To Contact Significant Ex-Partners**: Detail any significant ex-partners that need to be contacted.\n - **Medical**: Was the applicant informed that they would need to undergo a medical as part of the assessment? Did the applicant agree and provide his current health status?\n - **Pre-Approval Training**: Has the applicant undergone or is planning to carry out any training courses in relation to the adoption processes?\n - **Approval Panel**: Was the applicant made aware of the approval panel? Were any questions raised?\n - **Annual Carer Reviews**: Was the applicant made aware of the requirement for an annual carer review? Were any questions raised?\n - **Ongoing Training & Skills Development**: Was the applicant made aware of the need to complete the national requirement of 15 hours a year in training?\n - **Support & Supervision**: Was the applicant made aware they would be assigned a supervising social worker and have monthly supervision sessions? Were any questions raised?\n - **Payment / Expenses**: Was the applicant made aware of the payment and expenses made for fostering? Were any questions raised?\n - **Applicants Views On This**: What were the applicant'\''s expressed views on the process and were any questions asked? Were any questions raised?\n - **Reasons For Applying**: What are the applicant'\''s reasons for applying for fostering? Were any questions raised?\n - **What The Applicants Feel That They Can Bring To The Scheme**: What did the applicant feel that they could bring to the fostering scheme? Were any questions raised?\n - **Applicants Understanding Of Disability**: Did the applicant have an understanding of disability?\n - **Applicants Transferable Skills**: Does the applicant have any transferable skills they could apply to fostering?\n - **Possible Impact Of Becoming A Foster Carer On Own Family**: Has the applicant given consideration to the impact fostering may have on their own family?",
            "notes": "Ensure the summary is supportive, constructive, and professional.\n **Do NOT include any factual information that was not provided in the prompt context.**\n **If no information is available for any section, display '\''No Information Provided'\''.**"
        }
    }
}'

# Create Adult Stat Visit prompt
create_prompt "Social Worker - Adult - Adult Stat Visit" '{
    "name": "Social Worker - Adult",
    "subcategories": {
        "Adult Stat Visit": {
            "instruction": "Using prompt context, expand on the summary of the full transcript.",
            "task": "Your task is to analyze the transcript and expand on the following:",
            "details": "1. **List of Attendees**:\\n - Include full names, job titles, and departments.\\n - Specify their roles in the meeting and key contributions.\\n 2. **Discussion Points**:\\n - Detail each point with specific input from attendees.\\n - Include primary concerns and responses.\\n 3. **Elaboration on Each Discussion Point**:\\n - **Detailed Arguments**: Deep dive into who said what and why.\\n - **Background and Context**: Include relevant context.\\n - **Responses and Reactions**: Note any agreements or disagreements.\\n - **Examples and Data**: Incorporate supporting details.\\n - **Broader Implications**: Discuss future impacts.\\n 4. **Actions to Take/Decisions Made**:\\n - Clearly list decisions, actions to take, deadlines, and next steps.",
            "notes": "Focus on enriching the **Elaboration on Each Discussion Point** section with specific details, context, and examples.\\n Ensure the summary is supportive, constructive, and professional.\\n **Do NOT include any factual information that was not provided in the prompt context.**\\n **If no information is available for any section, display '\''No Information Provided'\''.**"
        }
    }
}'

echo -e "${GREEN}All prompts have been created successfully!${NC}"
echo "Script execution complete."
read -p "Press Enter to exit..."
