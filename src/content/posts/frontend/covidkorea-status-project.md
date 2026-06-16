## 소개

React.js를 학습하고 나서 처음으로 제작해본 토이 프로젝트를 소개한다.

지난 6월 말부터 조금씩 학습해온 React를 본격적으로 활용해보았다.
아직 미숙한 점이 많지만, 그래도 처음이 가지는 의미는 꽤 크다고 생각한다.

디자인과 설계, 세부 기능 구현을 혼자서 하다 보니 여러 문제도 많았다.
그래도 혼자서 깨부수는 건 내 전문이라고 자신하기 때문에, 끝내 완성을 해냈다.

- 개발 기간: **2022/07/01 ~ 2022/07/06** (5일)
- 배포 여부: **Yes** (Heroku 플랫폼)
- 사용 기술: **React.js, Chart.js, styled-component, Axios, Express**

---

## 기획: 코로나 통계 정보 사이트

React.js를 처음으로 배우면서 이를 활용할 수 있는 방법이 뭐가 있을지를 고민했다.
그러던 중, 공공데이터 사이트를 뒤져보다 코로나 관련 Open API를 제공한다는 것을 알게 되었다.
이를 활용하여 간단한 정보 제공 사이트를 만드는 게 좋겠다고 생각했다.

제공하고자 한 정보:

1. **일주일** 간격으로 전국의 코로나 확진자 수를 나열하고 시각화한다.
2. **전국 선별 진료소**를 시/도 별로 나누어 `3 X 3` 그리드 형식으로 나열한다.
3. 해당 사이트의 기능에 대한 정보를 간단하게 안내하는 섹션을 추가한다.

---

## Axios로 HTTP 통신 구현하기

Python Flask에서는 `request` 라이브러리로 HTTP 통신을 진행했는데, JS Express 환경에서는 `axios` 모듈을 써서 GET, POST 통신을 구현했다.

```javascript
const getCovidStatus = async (request) => {
    let response;
    try {
        response = await axios({
            method: 'GET',
            url: `${BASE_URL}/${process.env.COVID_STATUS_URL}`,
            params: {
                serviceKey: decodeURIComponent(process.env.COVID_STATUS_SERVICE_KEY),
            },
        });
    } catch (err) {
        console.log(err);
    }
    return response.data.response.result[0];
};
```

`dotenv` 모듈로 `.env` 환경 변수 파일을 핸들링하는 방식도 익혔다.
Flask에서 사용한 전적이 있어서 비교적 수월하게 사용할 수 있었다.

---

## styled-component로 Theme 모듈 설계

그동안은 React를 쓰면서 CSS Module로 각 컴포넌트를 디자인했다.
이번에 **styled-component**를 배우면서 JS 환경 내에서 CSS를 활용하는 방식을 익혔다.

```javascript
const fonts = {
    family: {
        base: `'Nanumsquare', sans-serif`,
        title: `'Noto Sans KR', serif`,
    },
    size: {
        xsm: '1rem',
        sm: '1.4rem',
        base: '1.6rem',
        lg: '2rem',
        xl: '2.5rem',
    },
    weight: {
        light: 100,
        normal: 400,
        bold: 700,
    },
};

const device = {
    mobile: `@media only screen and (max-width: ${size.mobile})`,
    tablet: `@media only screen and (max-width: ${size.tablet})`,
    desktop: `@media only screen and (max-width: ${size.desktop})`,
};

export const defaultTheme = {
    margins,
    paddings,
    fonts,
    device,
    colors,
};
```

자주 쓰는 CSS 옵션을 규격화시킨 Theme 모듈을 만들어 두니 스타일이 일관되어 사용이 훨씬 편해졌다.

---

## Chart.js로 주간 확진자 그래프 만들기

JS 모듈 중 그래프 관련 기능을 지원하는 `Chart.js` 라이브러리를 처음 사용해봤다.

```javascript
const CovidGraph = () => {
    const [loading, setLoading] = useState(true);
    const [corona, setCorona] = useState([]);

    useEffect(() => {
        const coronaStatus = async () => {
            let res = await axios.get('http://localhost:5000/api/status');
            setCorona(res.data);
            setLoading(false);
        };
        coronaStatus();
    }, []);

    const date = Array.from([...Array(7).keys()], (num) => corona[`mmdd${num + 1}`]);
    const confirmedCases = Array.from([...Array(7).keys()], (num) => corona[`cnt${num + 1}`]);

    const data = {
        labels: date,
        datasets: [{
            type: 'bar',
            label: '확진자',
            backgroundColor: 'rgba(0, 102, 176, 0.5)',
            data: confirmedCases,
        }],
    };

    return (
        <CovidGraphSection>
            {loading ? null : <ReactChart type='line' data={data} options={option} />}
        </CovidGraphSection>
    );
};
```

아직 코드가 불필요한 구간이 많고 난잡하다는 생각이 든다.
리팩터링 과정을 거치면서 상당 부분을 유연하게 변경할 예정이다.

---

## Node.js Express 서버 구축

**Node.js** 기반의 **Express**를 통해 백엔드 서버를 처음으로 구축해봤다.
문법은 CommonJS 형식이 아닌 ES6 기준으로 작성했다.

```javascript
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import covidStatusRouter from './api/covidStatus.js';
import traigeRouter from './api/traigeRoom.js';

dotenv.config({ encoding: 'utf8' });

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/status', covidStatusRouter);
app.post('/api/traige', traigeRouter);

app.listen(port, () => {
    console.log(`Example Express server with ${port}`);
});
```

그간 Python 기반의 Flask, Django에 익숙했던 나로서는 참 신기하고 생소했다.
사용해보고 나니 역시 Spring을 빨리 익혀야겠다는 생각밖에 들지 않았다. ~~(아직도 안 배웠다)~~

---

## 마무리하며

이렇게 나의 첫 **React.js** 프로젝트가 끝이 났다.
하지만 아직 해결해야 할 문제가 많기에 완전한 끝이라고 말할 수는 없다.

프로젝트를 진행하면서 아쉬웠던 점은 아래와 같다.

1. styled-component의 목적인 **재사용성**을 제대로 활용하지 못했다.
2. 컴포넌트 렌더링 과정에서 일부 최적화가 **진행되지 않았다.**
3. **모바일 버전** Layout을 아직 설계하지 못해 일부 섹션이 깨져 보인다.
4. 실 서비스를 위한 호스팅을 진행하지 않았다.

상단의 문제점들은 추후 리팩터링 과정을 통해 단계적으로 해결할 예정이다.
