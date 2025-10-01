import requests
import logging
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import json
import re
from typing import Dict, List, Optional, Tuple
from bs4 import BeautifulSoup
import time
import random
import urllib3
from functools import lru_cache

logger = logging.getLogger(__name__)

class ECourtScraper:
    def __init__(self):
        self.session = self._create_optimized_session()
        self.base_url = "https://services.ecourts.gov.in/"
        self.app_token = ""
        self.timeout = 15 
        self.max_retries = 3
        self.cache_timeout = 300  
        self._session_initialized = False
        self._last_case_context = None
        
    def _create_optimized_session(self) -> requests.Session:
        """Create session with pooling and retries."""
        session = requests.Session()
        
        retry_strategy = Retry(
            total=3,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["HEAD", "GET", "POST"],
            backoff_factor=1
        )
        
        adapter = HTTPAdapter(
            max_retries=retry_strategy,
            pool_connections=20,
            pool_maxsize=20,
            pool_block=False
        )
        
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        session.headers.update({
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
        })
        
        
        urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
        session.verify = True 
        
        return session
    
    def warm_session(self) -> bool:
        """Pre-warm the session for faster subsequent requests"""
        try:
            
            if not self._initialize_session():
                return False
            
            
            _, _ = self.get_states()
            
            return True
        except Exception as e:
            logger.warning(f"warm_session error: {e}")
            return False
    
    def clear_cache(self):
        """Clear LRU caches"""
        self.get_states.cache_clear()
        self.get_case_types.cache_clear()
    
    def _get_fallback_districts(self, state_code: str) -> List[Dict[str, str]]:
        return []
    
    def _get_fallback_court_complexes(self, state_code: str, dist_code: str) -> List[Dict[str, str]]:
        return []
    
    def _get_fallback_case_types(self) -> List[Dict[str, str]]:
        return []
    
    def _get_fallback_states(self) -> List[Dict[str, str]]:
        """Provide fallback state data when API is unavailable - CORRECTED WITH REAL ECOURTS CODES"""
        return [
            {"value": "2", "text": "Andhra Pradesh"},  
            {"value": "36", "text": "Arunachal Pradesh"},
            {"value": "6", "text": "Assam"},  
            {"value": "8", "text": "Bihar"},  
            {"value": "18", "text": "Chhattisgarh"},  
            {"value": "30", "text": "Goa"},  
            {"value": "17", "text": "Gujarat"},  
            {"value": "14", "text": "Haryana"},  
            {"value": "5", "text": "Himachal Pradesh"},  
            {"value": "7", "text": "Jharkhand"},  
            {"value": "12", "text": "Jammu and Kashmir"},  
            {"value": "3", "text": "Karnataka"},  
            {"value": "4", "text": "Kerala"},  
            {"value": "33", "text": "Ladakh"},  
            {"value": "23", "text": "Madhya Pradesh"},  
            {"value": "1", "text": "Maharashtra"},  
            {"value": "25", "text": "Manipur"},  
            {"value": "21", "text": "Meghalaya"},  
            {"value": "19", "text": "Mizoram"},  
            {"value": "34", "text": "Nagaland"},  
            {"value": "11", "text": "Odisha"},  
            {"value": "22", "text": "Punjab"},  
            {"value": "9", "text": "Rajasthan"},  
            {"value": "24", "text": "Sikkim"},  
            {"value": "10", "text": "Tamil Nadu"},  
            {"value": "29", "text": "Telangana"},  
            {"value": "20", "text": "Tripura"},  
            {"value": "13", "text": "Uttar Pradesh"},  
            {"value": "15", "text": "Uttarakhand"},  
            {"value": "16", "text": "West Bengal"},  
            {"value": "26", "text": "Delhi"},  
            {"value": "27", "text": "Chandigarh"},  
            {"value": "35", "text": "Puducherry"},  
            {"value": "28", "text": "Andaman and Nicobar Islands"},  
            {"value": "37", "text": "Lakshadweep"},  
            {"value": "38", "text": "Daman and Diu"},  
        ]
        
    def _initialize_session(self) -> bool:
        """Initialize session and get initial app_token for court order functionality"""
        if self._session_initialized:
            return True
            
        try:
            main_url = f"{self.base_url}ecourtindia_v6/?p=casestatus/index"
            
            response = self.session.get(
                main_url, 
                timeout=self.timeout,
                allow_redirects=True
            )
            
            if response.status_code == 200:
                
                token_match = re.search(r'name=["\']app_token["\']\s+value=["\']([^"\'\']+)["\']', response.text)
                if token_match:
                    self.app_token = token_match.group(1)
                else:
                    
                    soup = BeautifulSoup(response.text, 'html.parser')
                    token_input = soup.find('input', {'name': 'app_token'})
                    if token_input:
                        self.app_token = token_input.get('value', '')
                
                self._session_initialized = True
                return True
            return False
        except requests.exceptions.Timeout:
            return False
        except Exception as e:
            logger.warning(f"_initialize_session error: {e}")
            return False

    def _refresh_session(self) -> bool:
        """Attempt a lightweight session refresh when encountering a timeout.

        Tries to load the ecourts home to refresh the app_token without discarding cookies;
        on failure, performs a full re-init.
        """
        try:
            resp = self.session.get(f"{self.base_url}ecourtindia_v6/", timeout=self.timeout)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, 'html.parser')
                token_input = soup.find('input', {'name': 'app_token'})
                if token_input and token_input.get('value'):
                    self.app_token = token_input['value']
                    logger.debug("_refresh_session: token refreshed in-place")
                    return True
            logger.info("_refresh_session: falling back to full _initialize_session")
            # Full re-init path
            self.session = self._create_optimized_session()
            self._session_initialized = False
            return self._initialize_session()
        except Exception as e:
            logger.warning(f"_refresh_session error: {e}")
            self.session = self._create_optimized_session()
            self._session_initialized = False
            return self._initialize_session()
    
    def _parse_options(self, option_data) -> List[Dict[str, str]]:
        """Parse HTML option elements or other data structures into list of dictionaries"""
        options = []
        
        try:
            
            
            if isinstance(option_data, str) and option_data.strip():
                
                soup = BeautifulSoup(option_data, 'html.parser')
                option_elements = soup.find_all('option')
                
                if option_elements:
                    for option in option_elements:
                        value = option.get('value', '').strip()
                        text = option.get_text().strip()
                        
                        if value and value != '' and value != '0' and not text.lower().startswith('select'):
                            if '@' in value:
                                clean_value = value.split('@')[0]
                            else:
                                clean_value = value
                            
                            options.append({
                                'value': clean_value,
                                'text': text
                            })
                else:
                    lines = option_data.strip().split('\n')
                    for line in lines:
                        line = line.strip()
                        if line and '|' in line:
                            parts = line.split('|')
                            if len(parts) >= 2:
                                options.append({
                                    'value': parts[0].strip(),
                                    'text': parts[1].strip()
                                })
            
            elif isinstance(option_data, list):
                for item in option_data:
                    if isinstance(item, dict):
                        if 'value' in item and 'text' in item:
                            options.append(item)
                        elif 'id' in item and 'name' in item:
                            options.append({
                                'value': str(item['id']),
                                'text': str(item['name'])
                            })
            
            elif isinstance(option_data, dict):
                for key, value in option_data.items():
                    options.append({
                        'value': str(key),
                        'text': str(value)
                    })
        except Exception as e:
            logger.warning(f"_parse_options error: {e}")
        
        return options
    
    @lru_cache(maxsize=1)
    def get_states(self) -> Tuple[List[Dict[str, str]], str]:
        """Get list of available states for case status search with caching"""
        if not self._initialize_session():
            return self._get_fallback_states(), ""

        url = f"{self.base_url}ecourtindia_v6/?p=casestatus/index"

        try:
            response = self.session.get(
                url,
                timeout=self.timeout,
                headers={'X-Requested-With': 'XMLHttpRequest'}
            )
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                
                token_match = re.search(r'name=["\']app_token["\']\\s+value=["\']([^"\']+)["\']', response.text)
                if token_match:
                    self.app_token = token_match.group(1)
                else:
                    token_input = soup.find('input', {'name': 'app_token'})
                    if token_input:
                        self.app_token = token_input.get('value')
                
                state_select = None
                possible_selectors = [
                    {'id': 'state_code'},
                    {'name': 'state_code'}, 
                    {'class': 'state_code'},
                    {'id': 'state'},
                    {'name': 'state'}
                ]
                
                for selector in possible_selectors:
                    state_select = soup.find('select', selector)
                    if state_select:
                        break
                
                if not state_select:
                    all_selects = soup.find_all('select')
                    for select in all_selects:
                        options = select.find_all('option')
                        if len(options) > 10:
                            sample_texts = [opt.get_text().strip().lower() for opt in options[1:6]]
                            state_indicators = ['andhra', 'karnataka', 'tamil', 'kerala', 'gujarat', 'maharashtra', 'delhi', 'punjab']
                            if any(indicator in ' '.join(sample_texts) for indicator in state_indicators):
                                state_select = select
                                break
                
                if state_select:
                    states = []
                    all_options = state_select.find_all('option')
                    
                    for option in all_options:
                        value = option.get('value', '').strip()
                        text = option.get_text().strip()
                        
                        if value and value != '' and value != '0' and not text.lower().startswith('select'):
                            states.append({
                                'value': value,
                                'text': text
                            })
                    
                    if states:
                        return states, self.app_token
                else:
                    with open('/tmp/ecourts_debug.html', 'w') as f:
                        f.write(response.text)
            
            
            alt_url = f"{self.base_url}ecourtindia_v6/?p=casestatus/getStates"
            response = self.session.post(alt_url, data={'ajax_req': 'true'}, timeout=10)
            if response.status_code == 200:
                try:
                    json_response = response.json()
                    if json_response.get('status') == 1 and 'state_list' in json_response:
                        states = self._parse_options(json_response.get('state_list', ''))
                        if states:
                            return states, json_response.get('app_token', self.app_token)
                except:
                    pass
            
            return self._get_fallback_states(), self.app_token
            
        except Exception as e:
            logger.warning(f"get_states error: {e}")
            return self._get_fallback_states(), self.app_token
    
    def get_districts(self, state_code: str) -> Tuple[List[Dict[str, str]], str]:
        """Get districts for a given state code using the correct casestatus endpoint"""
        if not self._initialize_session():
            return [], ""
        
        url = f"{self.base_url}ecourtindia_v6/?p=casestatus/fillDistrict"
        
        data = {
            'state_code': state_code,
            'ajax_req': 'true',
            'app_token': self.app_token or 'c3d165775490f89b941ba7a0d8782fa6857e8f5c1d8e66db199d24af128f9b75'
        }
        
        try:
            response = self.session.post(
                url, 
                data=data, 
                timeout=self.timeout,
                headers={'X-Requested-With': 'XMLHttpRequest'}
            )
            if response.status_code == 200:
                try:
                    json_response = response.json()
                    status_value = json_response.get('status')
                    if status_value == 1 or status_value == '1':
                        dist_list_html = json_response.get('dist_list', '')
                        districts = self._parse_options(dist_list_html)
                        new_token = json_response.get('app_token', '')
                        
                        if new_token:
                            self.app_token = new_token
                        
                        if districts:
                            return districts, new_token
                except Exception as e:
                    logger.warning(f"get_districts parse error: {e}")
        except Exception as e:
            logger.warning(f"get_districts error: {e}")
        return [], ''
    
    def get_court_complexes(self, state_code: str, dist_code: str) -> Tuple[List[Dict[str, str]], str]:
        """Get court complexes for a given state and district for court order search"""
        if not self._initialize_session():
            return [], ""
            
        url = f"{self.base_url}ecourtindia_v6/?p=casestatus/fillcomplex"
        
        data = {
            'state_code': state_code,
            'dist_code': dist_code,
            'ajax_req': 'true',
            'app_token': self.app_token or '32a627595e60a3486c0f058aafd71a411d6c4d656f20600bbcce7bbf3e2dec5c'
        }
        
        try:
            response = self.session.post(
                url, 
                data=data, 
                timeout=self.timeout,
                headers={'X-Requested-With': 'XMLHttpRequest'}
            )
            if response.status_code == 200:
                try:
                    json_response = response.json()
                    status_value = json_response.get('status') or json_response.get('Status') or json_response.get('success')
                    if status_value == 1 or status_value == '1' or status_value == True or status_value == 'success':
                        complex_list = (json_response.get('complex_list') or 
                                      json_response.get('complexes') or 
                                      json_response.get('court_complexes') or 
                                      json_response.get('data') or 
                                      json_response.get('result', ''))
                        complexes = self._parse_options(complex_list)
                        enriched = []
                        raw_html = complex_list if isinstance(complex_list, str) else ""
                        value_map: Dict[str, Dict[str,str]] = {}
                        if raw_html:
                            for m in re.finditer(r"<option[^>]*value=([\"']?)([^ >\"']+?)\1[^>]*>(.*?)</option>", raw_html, re.IGNORECASE):
                                raw_val = m.group(2).strip()
                                text = BeautifulSoup(m.group(3), 'html.parser').get_text(strip=True)
                                parts = raw_val.split('@')
                                base_code = parts[0]
                                est_list = parts[1] if len(parts) > 1 else ''
                                flag = parts[2] if len(parts) > 2 else ''
                                value_map[base_code] = {
                                    'raw_value': raw_val,
                                    'est_list': est_list,
                                    'flag': flag,
                                    'text': text
                                }
                        for c in complexes:
                            meta = value_map.get(c['value'], {})
                            enriched.append({
                                'value': c['value'],
                                'text': c['text'],
                                'raw_value': meta.get('raw_value', c['value']),
                                'est_list': meta.get('est_list', ''),
                                'flag': meta.get('flag', '')
                            })
                        complexes = enriched
                        new_token = (json_response.get('app_token') or 
                                   json_response.get('token') or 
                                   json_response.get('csrf_token', ''))
                        
                        if new_token:
                            self.app_token = new_token
                        
                        if complexes:
                            return complexes, new_token
                except Exception as e:
                    logger.warning(f"get_court_complexes parse error: {e}")
            return [], ''
            
        except requests.exceptions.Timeout:
            return [], ''
        except Exception as e:
            logger.warning(f"get_court_complexes error: {e}")
            return [], ''
    
    @lru_cache(maxsize=10)
    def get_case_types(self, state_code: str, dist_code: str, court_complex_code: str, 
                      est_code: str = "", search_type: str = "c_no") -> Tuple[List[Dict[str, str]], str]:
        """Get case types for given parameters for court order search with caching"""
        if not self._initialize_session():
            return [], ""
            
        url = f"{self.base_url}ecourtindia_v6/?p=casestatus/fillCaseType"
        
        data = {
            'state_code': state_code,
            'dist_code': dist_code,
            'court_complex_code': court_complex_code,
            'est_code': est_code,
            'search_type': search_type,
            'ajax_req': 'true',
            'app_token': self.app_token or '9d5d5f36604f7d3fb7b5bd8befdeda4f425926a89d41bcd51f5ecbab0a68a914'
        }
        
        try:
            response = self.session.post(
                url, 
                data=data, 
                timeout=self.timeout,
                headers={'X-Requested-With': 'XMLHttpRequest'}
            )
            if response.status_code == 200:
                try:
                    json_response = response.json()
                    status_value = json_response.get('status') or json_response.get('Status') or json_response.get('success')
                    if status_value == 1 or status_value == '1' or status_value == True or status_value == 'success':
                        case_types_list = (json_response.get('casetype_list') or 
                                         json_response.get('case_type_list') or 
                                         json_response.get('case_types') or 
                                         json_response.get('types') or 
                                         json_response.get('data') or 
                                         json_response.get('result', ''))
                        case_types = self._parse_options(case_types_list)
                        new_token = (json_response.get('app_token') or 
                                   json_response.get('token') or 
                                   json_response.get('csrf_token', ''))
                        
                        if new_token:
                            self.app_token = new_token
                        
                        if case_types:
                            return case_types, new_token
                except Exception as e:
                    logger.warning(f"get_case_types parse error: {e}")
            return [], ''
            
        except Exception as e:
            logger.warning(f"get_case_types error: {e}")
            return [], ''
    
    def get_captcha_image_url(self) -> str:
        """(Legacy) Direct CAPTCHA image URL.

        Frontend now should call backend /api/captcha-url which returns a proxied
        /api/captcha-image?rand=... endpoint to keep the captcha image fetch within
        the same Python session (cookie continuity). Retained for backward compatibility.
        """
        random_param = ''.join(random.choices('0123456789abcdef', k=32))
        return f"{self.base_url}ecourtindia_v6/vendor/securimage/securimage_show.php?{random_param}"
    
    def submit_case_status(self, state_code: str, dist_code: str, court_complex_code: str,
                           case_type: str, case_no: str, rgyear: str, captcha_code: str,
                           est_code: str = "null") -> Tuple[Dict, str]:
        """Submit case for status (casestatus/submitCaseNo) and return structured case data."""
        if not self._initialize_session():
            return {'success': False, 'message': 'Failed to initialize session'}, ''

        url = f"{self.base_url}ecourtindia_v6/?p=casestatus/submitCaseNo"
        payload = {
            'case_type': case_type,
            'search_case_no': case_no,
            'rgyear': rgyear,
            'case_captcha_code': captcha_code,
            'state_code': state_code,
            'dist_code': dist_code,
            'court_complex_code': court_complex_code,
            'est_code': est_code,
            'case_no': case_no,
            'ajax_req': 'true',
            'app_token': self.app_token or 'c085559bf8944fd2ddf48edd20229c3925ccb218ea6929ee56f3904b96f83703'
        }

        try:
            start = time.time()
            resp = self.session.post(
                url, data=payload, timeout=self.timeout,
                headers={'X-Requested-With': 'XMLHttpRequest'}
            )
            dur = time.time() - start
            if resp.status_code != 200:
                return ({'success': False, 'message': f'HTTP {resp.status_code}'}, self.app_token)

            raw_text = resp.text
            
            j = None
            try:
                j = resp.json()
            except Exception:
                
                m = re.search(r'\{.*\}$', raw_text, re.DOTALL)
                if m:
                    try:
                        j = json.loads(m.group(0))
                    except Exception:
                        j = {}
                else:
                    j = {}

            case_html = ''
            captcha_html = ''
            if isinstance(j, dict):
                case_html = j.get('case_data', '') or j.get('case_html', '')
                captcha_html = j.get('div_captcha', '')
                if not case_html:
                    
                    for k in ['data', 'result', 'html']:
                        v = j.get(k)
                        if isinstance(v, str) and '<table' in v:
                            case_html = v
                            break
                new_token = j.get('app_token')
                if new_token:
                    self.app_token = new_token
            else:
                pass

            if not case_html:
                return ({
                    'success': False,
                    'message': 'Empty case listing',
                    'captcha_html': captcha_html,
                    'raw_snippet': raw_text[:500]
                }, self.app_token)

            
            listing_struct = self._parse_case_listing(case_html)

            # Detect record not found placeholder
            try:
                nf_soup = BeautifulSoup(case_html, 'html.parser')
                text_all = nf_soup.get_text(' ').lower()
                if nf_soup.find(id='nodata') or 'record not found' in text_all:
                    return ({
                        'success': False,
                        'message': 'Record not found',
                        'case_status_data': None,
                        'raw_html': case_html,
                        'captcha_html': captcha_html
                    }, self.app_token)
            except Exception:
                pass

            combined_result = {
                'success': True,
                'message': 'Case found',
                
                'case_status_data': {k: v for k, v in listing_struct.items() if k != 'view_history'},
                'raw_html': case_html,
                'captcha_html': captcha_html
            }

            # Persist minimal context to facilitate later PDF session reconstruction
            self._last_case_context = {
                'state_code': state_code,
                'dist_code': dist_code,
                'court_complex_code': court_complex_code,
                'case_type': case_type,
                'case_no': case_no,
                'rgyear': rgyear,
                'est_code': est_code or 'null',
                'view_history': listing_struct.get('view_history', {}) or {}
            }

            
            vh = listing_struct.get('view_history', {}) or {}
            case_no_vh = vh.get('case_no')
            cino_vh = vh.get('cino')
            court_code_vh = vh.get('court_code')

            if case_no_vh and cino_vh and court_code_vh:
                try:
                    
                    time.sleep(random.uniform(0.4, 0.9))
                    details_resp, new_token2 = self.get_case_details(
                        court_code=court_code_vh,
                        state_code=state_code,
                        dist_code=dist_code,
                        court_complex_code=court_complex_code,
                        case_no=case_no_vh,
                        cino=cino_vh,
                        search_flag='CScaseNumber',
                        search_by='CScaseNumber'
                    )
                    if new_token2:
                        self.app_token = new_token2
                        combined_result['app_token'] = new_token2
                    if details_resp and details_resp.get('success') and details_resp.get('case_details'):
                        case_details = details_resp['case_details']
                        combined_result['case_details'] = case_details
                        combined_result['case_details_raw'] = details_resp.get('raw_html', '')

                        
                        summary = {
                            'case_number': case_details.get('case_number') or listing_struct.get('case_number'),
                            'case_type': case_details.get('case_type') or listing_struct.get('case_type'),
                            'filing_number': case_details.get('filing_number'),
                            'filing_date': case_details.get('filing_date'),
                            'registration_number': case_details.get('registration_number'),
                            'registration_date': case_details.get('registration_date'),
                            'cnr_number': case_details.get('cnr_number'),
                            'court_name': case_details.get('court_name') or listing_struct.get('court_name'),
                            'judge': case_details.get('judge'),
                            'stage': case_details.get('stage'),
                            'next_date': case_details.get('next_date'),
                            'first_hearing_date': case_details.get('first_hearing_date'),
                            'petitioners': case_details.get('petitioners'),
                            'respondents': case_details.get('respondents'),
                            'acts': case_details.get('acts'),
                            'processes': case_details.get('processes'),
                            'case_history': case_details.get('case_history'),
                            'interim_orders': case_details.get('interim_orders')
                        }
                        combined_result['case_status_data'] = summary
                    else:
                        combined_result['case_details_error'] = details_resp.get('message') if details_resp else 'Unknown details retrieval failure'
                except Exception as e_det:
                    combined_result['case_details_error'] = f'Exception fetching details: {e_det}'
            else:
                combined_result['case_details_error'] = 'viewHistory parameters not found in listing'

            return (combined_result, self.app_token)
        except Exception as e:
            return ({'success': False, 'message': f'Exception: {e}'}, self.app_token)

    def _parse_case_listing(self, html: str) -> Dict:
        """Parse the submitCaseNo listing HTML into a structured dict.
        Extract case_type, case_number, petitioner, respondent, court_name & viewHistory params.
        """
        data = {
            'case_number': '',
            'case_type': '',
            'petitioner': '',
            'respondent': '',
            'court_name': '',
            'view_history': {}, 
            'raw_html': html
        }
        if not html:
            return data
        try:
            soup = BeautifulSoup(html, 'html.parser')
            court_anchor = soup.find('a', class_='noToken')
            if court_anchor:
                text = court_anchor.get_text(strip=True)
                data['court_name'] = text.split(':')[0].strip()
            table = soup.find('table')
            if not table:
                return data
            rows = table.find_all('tr')
            for tr in rows:
                tds = tr.find_all('td')
                if len(tds) >= 4 and tr.find('a', onclick=True):
                    
                    cty = tds[1].get_text(strip=True)
                    parts = [p.strip() for p in cty.split('/')]
                    if len(parts) >= 3:
                        data['case_type'] = parts[0]
                        data['case_number'] = f"{parts[1]}/{parts[2]}"
                    
                    parties_text = tds[2].get_text('\n', strip=True)
                    if 'Vs' in parties_text or 'vs' in parties_text:
                        segs = re.split(r'Vs', parties_text, flags=re.I)
                        if len(segs) >= 2:
                            data['petitioner'] = segs[0].replace('\n', ' ').strip()
                            data['respondent'] = segs[1].replace('\n', ' ').strip()
                    a = tds[3].find('a', onclick=True)
                    if a:
                        m = re.search(r"viewHistory\(([^)]+)\)", a['onclick'])
                        if m:
                            args = [arg.strip().strip("'\"") for arg in m.group(1).split(',')]
                            if len(args) >= 3:
                                data['view_history'] = {
                                    'case_no': args[0],
                                    'cino': args[1],
                                    'court_code': args[2]
                                }
                    break
        except Exception:
            pass
        return data
        
    
    def get_case_details(self, court_code: str, state_code: str, dist_code: str, 
                        court_complex_code: str, case_no: str, cino: str,
                        search_flag: str = "CScaseNumber", search_by: str = "CScaseNumber") -> Tuple[Dict, str]:
        """Get detailed case information using viewHistory endpoint"""
        if not self._initialize_session():
            return {
                'success': False,
                'message': 'Failed to initialize session'
            }, ''

        url = f"{self.base_url}ecourtindia_v6/?p=home/viewHistory"
        data = {
            'court_code': court_code,
            'state_code': state_code,
            'dist_code': dist_code,
            'court_complex_code': court_complex_code,
            'case_no': case_no,
            'cino': cino,
            'hideparty': '',
            'search_flag': search_flag,
            'search_by': search_by,
            'ajax_req': 'true',
            'app_token': self.app_token or 'c085559bf8944fd2ddf48edd20229c3925ccb218ea6929ee56f3904b96f83703'
        }
    

        try:
            start_time = time.time()
            response = self.session.post(
                url,
                data=data,
                timeout=self.timeout,
                headers={'X-Requested-With': 'XMLHttpRequest'}
            )
            response_time = time.time() - start_time

            if response.status_code == 200:
                raw_text = response.text
                try:
                    json_response = response.json()
                except Exception as e_json:
                    return {
                        'success': False,
                        'message': f'Failed to parse response JSON: {e_json}',
                        'raw_snippet': raw_text[:500]
                    }, ''

                new_token = json_response.get('app_token', '')
                if new_token:
                    self.app_token = new_token

                data_list = json_response.get('data_list', '')
                if data_list:
                    parsed_data = self._parse_case_details_html(data_list)
                    return {
                        'success': True,
                        'message': 'Case details retrieved successfully',
                        'case_details': parsed_data,
                        'raw_html': data_list
                    }, new_token
                else:
                    return {
                        'success': False,
                        'message': 'No case details found in response'
                    }, new_token

            else:
                return {
                    'success': False,
                    'message': f'HTTP {response.status_code}: {response.text[:200]}'
                }, ''

        except Exception:
            return {
                'success': False,
                'message': 'Error getting case details'
            }, ''

    def _parse_case_details_html(self, html_content: str) -> Dict:
        """Parse the detailed case information from viewHistory HTML response"""
        try:
            soup = BeautifulSoup(html_content, 'html.parser')
            
            case_details = {
                'case_number': '',
                'case_type': '',
                'filing_number': '',
                'filing_date': '',
                'registration_number': '',
                'registration_date': '',
                'cnr_number': '',
                'court_name': '',
                'judge': '',
                'stage': '',
                'next_date': '',
                'first_hearing_date': '',
                'petitioners': [],
                'respondents': [],
                'acts': [],
                'processes': [],
                'case_history': [],
                'interim_orders': []
            }

            def normalize_label(s: str) -> str:
                return re.sub(r'\s+', ' ', s.strip().lower().replace('\xa0', ' '))

            def looks_like_date(val: str) -> bool:
                return bool(re.fullmatch(r'\d{2}[-/]\d{2}[-/]\d{4}', val.strip())) or bool(re.fullmatch(r'\d{1,2}(st|nd|rd|th)\s+[A-Za-z]+\s+\d{4}', val.strip()))

            
            all_tables = soup.find_all('table')
            for table in all_tables:
                
                headers = [normalize_label(th.get_text()) for th in table.find_all('th')]
                if any(h for h in headers if 'process id' in h or 'order number' in h or 'business on date' in h):
                    continue

                rows = table.find_all('tr')
                for row in rows:
                    cells = row.find_all(['td', 'th'])
                    if not cells:
                        continue
                    
                    if len(cells) >= 4:
                        
                        for i in range(0, len(cells)-1, 2):
                            label_raw = normalize_label(cells[i].get_text())
                            value_raw = cells[i+1].get_text(strip=True)
                            if not label_raw or not value_raw:
                                continue
                            
                            if 'case type' in label_raw and not case_details['case_type']:
                                case_details['case_type'] = value_raw
                            elif 'filing number' in label_raw and not case_details['filing_number']:
                                case_details['filing_number'] = value_raw
                            elif 'filing date' in label_raw and not case_details['filing_date']:
                                case_details['filing_date'] = value_raw
                            elif 'registration number' in label_raw and not case_details['registration_number']:
                                case_details['registration_number'] = value_raw
                            elif 'registration date' in label_raw and not case_details['registration_date']:
                                case_details['registration_date'] = value_raw
                            elif 'cnr number' in label_raw and not case_details['cnr_number']:
                                
                                case_details['cnr_number'] = value_raw.split('(')[0].strip()
                            elif ('court number and judge' in label_raw or 'court number' in label_raw) and not case_details['judge']:
                                
                                case_details['judge'] = value_raw
                            elif ('next hearing date' in label_raw or 'next date' in label_raw) and not case_details['next_date']:
                                case_details['next_date'] = value_raw
                            elif 'first hearing' in label_raw and not case_details['first_hearing_date']:
                                case_details['first_hearing_date'] = value_raw
                            elif ('stage' in label_raw or 'case stage' in label_raw or 'status' in label_raw) and not case_details['stage']:
                                case_details['stage'] = value_raw
                    else:
                        
                        if len(cells) >= 2:
                            label_raw = normalize_label(cells[0].get_text())
                            value_raw = cells[1].get_text(strip=True)
                            if not label_raw or not value_raw:
                                continue
                            if 'case type' in label_raw and not case_details['case_type']:
                                case_details['case_type'] = value_raw
                            elif 'filing number' in label_raw and not case_details['filing_number']:
                                case_details['filing_number'] = value_raw
                            elif 'filing date' in label_raw and not case_details['filing_date']:
                                case_details['filing_date'] = value_raw
                            elif 'registration number' in label_raw and not case_details['registration_number']:
                                case_details['registration_number'] = value_raw
                            elif 'registration date' in label_raw and not case_details['registration_date']:
                                case_details['registration_date'] = value_raw
                            elif 'cnr number' in label_raw and not case_details['cnr_number']:
                                case_details['cnr_number'] = value_raw.split('(')[0].strip()
                            elif ('court number and judge' in label_raw or 'court number' in label_raw) and not case_details['judge']:
                                if not looks_like_date(value_raw):
                                    case_details['judge'] = value_raw
                            elif ('next hearing date' in label_raw or 'next date' in label_raw) and not case_details['next_date']:
                                case_details['next_date'] = value_raw
                            elif 'first hearing' in label_raw and not case_details['first_hearing_date']:
                                case_details['first_hearing_date'] = value_raw
                            elif ('stage' in label_raw or 'case stage' in label_raw or 'status' in label_raw) and not case_details['stage']:
                                case_details['stage'] = value_raw

            
            heading = soup.find(id='chHeading') or soup.find('h2')
            if heading:
                heading_text = heading.get_text(" ", strip=True)
                if heading_text:
                    case_details['court_name'] = heading_text

            
            def extract_party(table, target_list):
                if not table:
                    return
                cells = table.find_all('td')
                for cell in cells:
                    raw = cell.decode_contents().replace('<br/>', '\n').replace('<br />', '\n')
                    text = BeautifulSoup(raw, 'html.parser').get_text('\n', strip=True)
                    if not text:
                        continue
                    
                    lines = [l.strip() for l in re.split(r'\n+', text) if l.strip()]
                    buffer = ' '.join(lines)
                    
                    adv_split = re.split(r'advocate[-:]?', buffer, flags=re.I)
                    if len(adv_split) >= 2:
                        name = adv_split[0]
                        advocate = adv_split[1]
                        target_list.append({
                            'name': re.sub(r'^\d+\)\s*', '', name).strip(' -:'),
                            'advocate': advocate.strip(' -:')
                        })
                    else:
                        target_list.append({
                            'name': re.sub(r'^\d+\)\s*', '', buffer).strip(' -:'),
                            'advocate': ''
                        })

            petitioner_table = soup.find('table', class_=re.compile(r'Petitioner_Advocate_table', re.I))
            respondent_table = soup.find('table', class_=re.compile(r'Respondent_Advocate_table', re.I))
            extract_party(petitioner_table, case_details['petitioners'])
            extract_party(respondent_table, case_details['respondents'])

            
            for table in all_tables:
                headers = [normalize_label(th.get_text()) for th in table.find_all('th')]
                if headers and any('under act' in h or h == 'under act(s)' for h in headers):
                    rows = table.find_all('tr')[1:]
                    for row in rows:
                        cells = row.find_all('td')
                        if len(cells) >= 2:
                            act_name = cells[0].get_text(strip=True)
                            sections = cells[1].get_text(strip=True)
                            if act_name and sections:
                                case_details['acts'].append({'act_name': act_name, 'sections': sections})

            
            process_table = None
            for t in all_tables:
                if t.get('id') == 'process' or re.search(r'process', t.get_text(), re.I):
                    ths = [normalize_label(th.get_text()) for th in t.find_all('th')]
                    if any('process id' in th for th in ths):
                        process_table = t
                        break
            if process_table:
                
                rows = process_table.find_all('tr')
                if rows:
                    
                    data_tds = []
                    for r in rows[1:]:
                        tds = r.find_all('td')
                        if tds:
                            data_tds.extend(tds)
                    
                    if not data_tds:
                        data_tds = process_table.find_all('td')
                    chunks = [data_tds[i:i+3] for i in range(0, len(data_tds), 3)]
                    for chunk in chunks:
                        if len(chunk) >= 2:
                            process_id = chunk[0].get_text(strip=True)
                            process_title = chunk[1].get_text(strip=True)
                            process_date = chunk[2].get_text(strip=True) if len(chunk) > 2 else ''
                            if process_id or process_title:
                                case_details['processes'].append({
                                    'process_id': process_id,
                                    'process_title': process_title,
                                    'process_date': process_date
                                })

            
            history_table = None
            for t in all_tables:
                if t.get('class') and any('history_table' in c for c in t.get('class', [])):
                    history_table = t
                    break
                ths = [normalize_label(th.get_text()) for th in t.find_all('th')]
                if ths and ('business on date' in ' '.join(ths) or 'hearing date' in ' '.join(ths)):
                    history_table = t
                    break
            if history_table:
                rows = history_table.find_all('tr')[1:]
                for r in rows:
                    cells = r.find_all('td')
                    if len(cells) >= 3:
                        judge = cells[0].get_text(strip=True)
                        business_date = cells[1].get_text(strip=True)
                        hearing_date = cells[2].get_text(strip=True)
                        purpose = cells[3].get_text(strip=True) if len(cells) > 3 else ''
                        case_details['case_history'].append({
                            'judge': judge,
                            'business_date': business_date,
                            'hearing_date': hearing_date,
                            'purpose_of_hearing': purpose
                        })

            
            orders_table = None
            for t in all_tables:
                
                ths = [normalize_label(th.get_text()) for th in t.find_all('th')]
                if ths and any('order number' in h for h in ths):
                    orders_table = t
                    break
                
                if not ths:
                    first_tr = t.find('tr')
                    if first_tr:
                        header_cells = [normalize_label(c.get_text()) for c in first_tr.find_all('td')]
                        if header_cells and 'order number' in ' '.join(header_cells):
                            orders_table = t
                            break
            if orders_table:
                rows = orders_table.find_all('tr')
                if rows:
                    
                    start_index = 1 if 'order number' in normalize_label(rows[0].get_text()) else 0
                    for r in rows[start_index:]:
                        cells = r.find_all('td')
                        if len(cells) >= 2: 
                            order_number = cells[0].get_text(strip=True)
                            order_date = cells[1].get_text(strip=True) if len(cells) > 1 else ''
                            
                            details_cell = cells[2] if len(cells) > 2 else (cells[1] if len(cells) == 2 else None)
                            order_details_text = ''
                            pdf_url = ''
                            if details_cell:
                                
                                anchor = details_cell.find('a', onclick=True)
                                if anchor:
                                    order_details_text = anchor.get_text(" ", strip=True)
                                    onclick_val = anchor.get('onclick', '')
                                    m_pdf = re.search(r"displayPdf\('([^']+)'", onclick_val)
                                    if m_pdf:
                                        pdf_url = m_pdf.group(1)
                                if not order_details_text:
                                    order_details_text = details_cell.get_text(" ", strip=True)
                            
                            if any([order_number, order_date, order_details_text]):
                                # pdf_url currently holds the full raw argument passed to displayPdf('...')
                                # Preserve it under a clearer key while keeping backward compatibility.
                                case_details['interim_orders'].append({
                                    'order_number': order_number.lstrip('\u00a0').strip(' .'),
                                    'order_date': order_date.replace('\u00a0', ' ').strip(),
                                    'order_details': order_details_text.replace('\u00a0', ' ').strip(),
                                    'pdf_url': pdf_url,  # legacy key used by frontend
                                    'display_pdf_arg': pdf_url  # new explicit key
                                })

            
            text_block = soup.get_text(' ', strip=True)
            if not case_details['cnr_number']:
                m = re.search(r'\b([A-Z]{4}\d{10}\d{2}\d{4})\b', text_block)
                if m:
                    case_details['cnr_number'] = m.group(1)
            if not case_details['filing_number']:
                m = re.search(r'filing number\s*:?\s*([0-9/]+)', text_block, re.I)
                if m:
                    case_details['filing_number'] = m.group(1)
            if not case_details['registration_number']:
                m = re.search(r'registration number\s*:?\s*([0-9/]+)', text_block, re.I)
                if m:
                    case_details['registration_number'] = m.group(1)

            return case_details
            
        except Exception:
            return {
                'case_number': '',
                'case_type': '',
                'filing_number': '',
                'filing_date': '',
                'registration_number': '',
                'registration_date': '',
                'cnr_number': '',
                'court_name': '',
                'judge': '',
                'stage': '',
                'next_date': '',
                'first_hearing_date': '',
                'petitioners': [],
                'respondents': [],
                'acts': [],
                'processes': [],
                'case_history': [],
                'interim_orders': [],
                'error': 'Parsing failed'
            }
    
    def scrape_case_info(self, state_code: str, district_code: str, court_complex_code: str,
                        case_type: str, case_number: str, registration_year: str, 
                        captcha_code: str) -> Dict:
        """Main method to scrape case information with all steps"""
        
        
        if not self.session.cookies:
            if not self._initialize_session():
                return {
                    'success': False,
                    'message': 'Failed to initialize session'
                }
        
        
        time.sleep(random.uniform(1, 3))
        
        
        result, token = self.submit_case_status(
            state_code, district_code, court_complex_code,
            case_type, case_number, registration_year, captcha_code
        )
        
        return result

    def fetch_order_pdf(self, pdf_request: str) -> Tuple[Optional[bytes], str, str]:
        """Fetch an interim order PDF using the raw argument extracted from displayPdf().

        The incoming string typically looks like:
        home/display_pdf&normal_v=1&case_val=Hindu~Marriage~Act/0000133/2025&cCode=1&appFlag=&filename=/orders/2025/200100001332025_1.pdf&court_code=1

        We must:
          1. Split at the first '&' to isolate the path (home/display_pdf) and the query fragment
          2. Issue a POST to ecourt base: ecourtindia_v6/?p=<path>&<query>
          3. Supply form data: ajax_req=true & app_token=current token
          4. The response is JSON with an 'order' field that points to a reports/<session>.pdf path
          5. Perform a GET to that path (relative to base_url) to obtain the actual PDF bytes.

        Returns: (pdf_bytes_or_None, download_filename, new_app_token_or_existing)
        """
        if not pdf_request:
            logger.warning("fetch_order_pdf: empty pdf_request")
            return None, "", self.app_token
        # Only initialize if we truly have no cookies yet; don't blow away existing stateful session.
        if not self.session.cookies:
            if not self._initialize_session():
                return None, "", self.app_token
        try:
            # Direct relative PDF path fallback (user passed already-resolved path like reports/abc.pdf)
            direct_match = re.match(r"^/?(reports|orders)/.+\.pdf$", pdf_request.strip())
            if direct_match:
                rel = pdf_request.lstrip('/')
                pdf_url = f"{self.base_url}{rel}"
                pdf_resp = self.session.get(pdf_url, timeout=self.timeout, headers={'Referer': self.base_url})
                if pdf_resp.status_code == 200 and pdf_resp.content.startswith(b'%PDF'):
                    return pdf_resp.content, rel.split('/')[-1], self.app_token
                logger.warning(f"fetch_order_pdf direct path failed status={pdf_resp.status_code}")
                return None, '', self.app_token

            parts = pdf_request.split('&', 1)
            if len(parts) == 1:
                path_part = parts[0]
                query_rest = ''
            else:
                path_part, query_rest = parts
            path_part = path_part.strip('/')  # e.g. home/display_pdf
            base_endpoint = f"{self.base_url}ecourtindia_v6/?p={path_part}"
            full_url_initial = base_endpoint + (f"&{query_rest}" if query_rest else '')

            # NEW: try direct filename param (e.g. filename=/orders/2025/....pdf) before invoking display_pdf
            if query_rest:
                m_fname = re.search(r"filename=([^&]+)", query_rest)
                if m_fname:
                    raw_fname = m_fname.group(1)
                    # URL decode minimal (%2F etc.)
                    try:
                        from urllib.parse import unquote
                        raw_fname = unquote(raw_fname)
                    except Exception:
                        pass
                    if re.match(r"^/?(orders|reports)/.+\.pdf$", raw_fname.lower()):
                        direct_rel = raw_fname.lstrip('/')
                        direct_url = f"{self.base_url}{direct_rel}"
                        logger.debug(f"fetch_order_pdf direct filename attempt {direct_url}")
                        resp_direct = self.session.get(direct_url, timeout=self.timeout, headers={'Referer': self.base_url})
                        if resp_direct.status_code == 200 and resp_direct.content.startswith(b'%PDF'):
                            return resp_direct.content, direct_rel.split('/')[-1], self.app_token
                        else:
                            logger.debug(f"fetch_order_pdf direct filename attempt failed status={resp_direct.status_code}")

            def attempt_post(url: str) -> Tuple[Optional[Dict], str]:
                # Parse query params so we can redundantly send them as form fields (some backends require this duplication)
                query_params: Dict[str, str] = {}
                if '?' in url:
                    # Extract the part after '?p=...' we've already assembled; safer to rebuild from original query_rest
                    if query_rest:
                        for kv in query_rest.split('&'):
                            if '=' in kv:
                                k, v = kv.split('=', 1)
                                if k and v:
                                    from urllib.parse import unquote
                                    query_params[k] = unquote(v)
                post_data_local = {**query_params,
                                   'ajax_req': 'true',
                                   'app_token': self.app_token or ''}
                logger.debug(f"fetch_order_pdf POST {url} form_keys={list(post_data_local.keys())}")
                headers = {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': f"{self.base_url}ecourtindia_v6/?p=casestatus/index",
                    'Origin': self.base_url.rstrip('/'),
                    'Accept': 'application/json, text/javascript, */*; q=0.01',
                }
                resp_local = self.session.post(url, data=post_data_local, timeout=self.timeout, headers=headers)
                if resp_local.status_code != 200:
                    logger.warning(f"fetch_order_pdf upstream status {resp_local.status_code}")
                    return None, ''
                try:
                    js = resp_local.json()
                except Exception:
                    logger.warning("fetch_order_pdf: response not JSON parseable")
                    return None, ''
                new_tok = js.get('app_token') or ''
                if new_tok:
                    self.app_token = new_tok
                return js, new_tok

            # Try up to 2 attempts (initial + one retry on session timeout)
            attempts = 0
            order_json: Optional[Dict] = None
            url_to_use = full_url_initial

            # PRE-FLIGHT: If we have stored view_history context, invoke viewHistory to rebuild the detailed session context
            vh_ctx = None
            try:
                if self._last_case_context and isinstance(self._last_case_context, dict):
                    vh_ctx = self._last_case_context.get('view_history') or None
                if vh_ctx and {'case_no','cino','court_code'} <= set(vh_ctx.keys()):
                    logger.debug("fetch_order_pdf preflight: invoking viewHistory")
                    try:
                        self.get_case_details(
                            court_code=vh_ctx['court_code'],
                            state_code=self._last_case_context['state_code'],
                            dist_code=self._last_case_context['dist_code'],
                            court_complex_code=self._last_case_context['court_complex_code'],
                            case_no=vh_ctx['case_no'],
                            cino=vh_ctx['cino'],
                            search_flag='CScaseNumber',
                            search_by='CScaseNumber'
                        )
                    except Exception as e_vh:
                        logger.debug(f"fetch_order_pdf preflight viewHistory error: {e_vh}")
            except Exception:
                pass
            while attempts < 2:
                # Preflight each attempt with a light touch to keep cookies fresh (GET the case status index)
                try:
                    self.session.get(f"{self.base_url}ecourtindia_v6/?p=casestatus/index", timeout=8)
                except Exception:
                    pass
                order_json, _ = attempt_post(url_to_use)
                attempts += 1
                if not order_json:
                    break
                order_path = order_json.get('order')
                if order_path and order_path.lower().endswith('.pdf'):
                    break  # success path acquired
                err_msg = (order_json.get('errormsg') or '').lower()
                # If invalid request or timeout, attempt to replay last case context before retry
                if attempts < 2 and (('invalid request' in err_msg) or ('session timeout' in err_msg)) and self._last_case_context:
                    logger.info("fetch_order_pdf: attempting context replay before retry")
                    ctx = self._last_case_context
                    try:
                        # We cannot redo captcha, but server may allow reusing existing context if cookies persist
                        replay_payload = {
                            'case_type': ctx['case_type'],
                            'search_case_no': ctx['case_no'],
                            'rgyear': ctx['rgyear'],
                            'case_captcha_code': '',  # empty on replay
                            'state_code': ctx['state_code'],
                            'dist_code': ctx['dist_code'],
                            'court_complex_code': ctx['court_complex_code'],
                            'est_code': ctx.get('est_code', 'null'),
                            'case_no': ctx['case_no'],
                            'ajax_req': 'true',
                            'app_token': self.app_token or ''
                        }
                        replay_url = f"{self.base_url}ecourtindia_v6/?p=casestatus/submitCaseNo"
                        r_resp = self.session.post(replay_url, data=replay_payload, timeout=self.timeout, headers={'X-Requested-With': 'XMLHttpRequest'})
                        if r_resp.status_code == 200:
                            try:
                                rj = r_resp.json()
                                nt = rj.get('app_token')
                                if nt:
                                    self.app_token = nt
                            except Exception:
                                pass
                    except Exception as e_replay:
                        logger.debug(f"fetch_order_pdf replay error: {e_replay}")
                if 'session timeout' in err_msg and attempts < 2:
                    logger.info("fetch_order_pdf: session timeout detected, attempting _refresh_session and retrying once")
                    if self._refresh_session():
                        continue
                # If not a session timeout or already retried, stop loop
                break

            if not order_json:
                return None, '', self.app_token
            order_path = order_json.get('order')
            if not order_path or not order_path.lower().endswith('.pdf'):
                # Final fallback: try GET variant (some deployments use GET returning raw PDF or JSON)
                try:
                    headers_get = {'Referer': f"{self.base_url}ecourtindia_v6/?p=casestatus/index"}
                    logger.debug("fetch_order_pdf attempting GET fallback for display_pdf")
                    get_resp = self.session.get(full_url_initial, timeout=self.timeout, headers=headers_get)
                    if get_resp.status_code == 200:
                        # Try interpret as JSON
                        try:
                            js2 = get_resp.json()
                            alt_path = js2.get('order')
                            if alt_path and alt_path.lower().endswith('.pdf'):
                                order_path = alt_path
                        except Exception:
                            # Maybe it's a PDF outright
                            if get_resp.content.startswith(b'%PDF'):
                                fname_guess = 'order.pdf'
                                return get_resp.content, fname_guess, self.app_token
                except Exception as eg:
                    logger.debug(f"fetch_order_pdf GET fallback error: {eg}")
                if not order_path or not order_path.lower().endswith('.pdf'):
                    logger.warning(f"fetch_order_pdf: invalid order path in json after {attempts} attempt(s): {order_json}")
                    return None, '', self.app_token

            order_path_clean = order_path.lstrip('/')
            candidates = [
                f"{self.base_url}{order_path_clean}",
                # Some deployments may require ecourtindia_v6 prefix before reports path
                f"{self.base_url}ecourtindia_v6/{order_path_clean}" if not order_path_clean.startswith('ecourtindia_v6/') else None
            ]
            tried_errors = []
            for cand in [c for c in candidates if c]:
                pdf_resp = self.session.get(cand, timeout=self.timeout, headers={'Referer': self.base_url})
                if pdf_resp.status_code == 200 and (pdf_resp.headers.get('Content-Type','').lower().startswith('application/pdf') or pdf_resp.content.startswith(b'%PDF')):
                    filename = order_path.split('/')[-1]
                    return pdf_resp.content, filename, self.app_token
                tried_errors.append(f"{cand} -> {pdf_resp.status_code}")
            logger.warning(f"fetch_order_pdf: downstream not PDF; tried: {'; '.join(tried_errors)}")
            return None, '', self.app_token
            # (Unreachable due to returns above)
        except Exception as e:
            logger.warning(f"fetch_order_pdf error: {e}")
            return None, '', self.app_token