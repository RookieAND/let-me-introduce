
> setState를 많이 실행시켜도 리렌더링이 **한번만** 일어나는 이유는 무엇인가?  

React를 사용하다 보면 필연적으로 state를 다룰 수밖에 없게 되고, 이를 사용하다 보면 문득 드는 한 가지 의문이 존재한다. 분명 setState 함수는 리렌더링을 유발한다고 했는데 왜 여러번 실행을 해도 한 번만 리렌더링이 진행되는 걸까?  
지금은 React 에서 이를 Batching 처리하여 일괄적으로 처리함을 알고 있었지만, React 18에서 소개하는 Automatic Batching은 기존의 Batching 작업을 개선했다고 말하길래 어떤 부분을 개선했는지가 굉장히 궁금하였다. 따라서 공식 문서와 React의 메인테이너 분께서 작성한 글을 토대로 React 에서는 state update 작업을 어떻게 처리하는지 파헤쳐보고자 한다.  

## Automatic Batching

### Batching 이란?

- `state` 값이 변경되었을 경우 React 에서는 해당 컴포넌트를 리렌더링 하며, 불필요한 리렌더링을 방지하기 위해 state를 변경하는 작업을 **일괄적으로 처리**한다.
- 이렇게 `state` 의 업데이트 작업을 모아 일괄 처리하는 방식을 **Batching** 이라고 하며, 이 덕에 React 에서는 불필요한 리렌더링을 방지할 수 있게 되었다.

```jsx
import { useState } from "react";

function Counter() {
	const [count, setCount] = useState(0);

	function increaseCountThree() {
		// 아래의 작업은 모두 일괄적으로 묶여 처리된다. 한 번의 리렌더링만 발생한다.
		setCount((prev) => prev + 1);
		setCount((prev) => prev + 1);
		setCount((prev) => prev + 1);
	}

	return (
		<div>
			<button onClick={increaseCountThree}>+1</button>
			<p>Count : {count}</p>
		</div>
	);
}

export default Counter;
```

- 상단의 코드는 setter 함수를 **세 차례 실행**시켰기 때문에 리렌더링도 세 번 발생할 것 같지만, 실제로 코드를 실행해보면 **리렌더링은 한번만 발생한다**.
- React 는 여러 번의 state update 작업을 Queue에 몰아넣고 일정 주기마다 Queue에 등록된 작업을 순차적으로 일괄 시행하면서 불필요한 리렌더링을 방지한다.

### React 18에서 추가된 Automatic Batching 이란?

- React 18 버전 이하에서는 오직 React 의 **이벤트 핸들러 내부의** state update 작업에 대해서만 Batching 이 가능했다. 하지만 Promise나 setTimeout, Native Event Handler 내부의 작업은 불가능했다.
- 왜냐하면 이전에는 **브라우저의 이벤트가 실행되는 중에만** Batching 작업을 수행했기 때문이다. 따라서 이벤트가 종료된 후에 실행되는 경우는 Batching 작업이 불가능했다.
- 하단의 코드의 경우 state update 작업이 비동기적으로 처리되어 Event가 종료된 후에 실행되기 때문에, React의 Batching 작업에 걸리지 않아 두 차례 리렌더링을 유발시켰다.

```jsx
function App() {
	const [count, setCount] = useState(0);
	const [flag, setFlag] = useState(false);

	function handleClick() {
		fetchSomething().then(() => {
			// React 17 이전의 버전에서는 해당 작업을 Batching 처리하지 않는다.
			// 왜냐하면 해당 작업은 이벤트가 종료된 이후 (100ms 뒤) 에 실행되기 때문이다.
			setCount((c) => c + 1); // 리렌더링 유발
			setFlag((f) => !f); // 리렌더링 유발
		});
	}

	return (
		<div>
			<button onClick={handleClick}>Next</button>
			<h1 style={{ color: flag ? "blue" : "black" }}>{count}</h1>
		</div>
	);
}

function fetchSomething() {
	return new Promise((resolve) => setTimeout(resolve, 100));
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
```

- 하지만 React 18 버전 이후부터는 단순히 이벤트 핸들러 내부 뿐만이 아니라 Promise나 setTimeout, Native Event Handler 같은 작업에 대해서도 Batching 작업을 **자동으로** 수행하게 해주었다.
- React 18 에서 제공하는 `ReactDOM.createRoot` 메서드를 기반으로 렌더링을 진행할 경우 모든 state update 작업은 자동으로 Batching 처리된다. 이 기능을 **Automatic Batching ** 이라고 한다.

```jsx
function App() {
	const [count, setCount] = useState(0);
	const [flag, setFlag] = useState(false);

	function handleClick() {
		fetchSomething().then(() => {
			// React 18 이후에서는 해당 작업을 Batching 처리 한다.
			setCount((c) => c + 1);
			setFlag((f) => !f);
			// React 는 해당 작업을 일괄 처리하여 한 번의 리렌더링만 진행한다.
		});
	}

	return (
		<div>
			<button onClick={handleClick}>Next</button>
			<h1 style={{ color: flag ? "blue" : "black" }}>{count}</h1>
		</div>
	);
}

function fetchSomething() {
	return new Promise((resolve) => setTimeout(resolve, 100));
}

const rootElement = document.getElementById("root");
// React 18 에서 새롭게 제공하는 createRoot 메서드를 사용해야 한다!
ReactDOM.createRoot(rootElement).render(<App />);
```

### 중요한 것은 각각의 작업이 batching 된다는 것

```js
import { useLayoutEffect, useRef, useState } from 'react';

function App() {
  const [test, setTest] = useState(1);
  const testRef = useRef<any>(0);

  const trigger = () => setTest((prev) => {
    console.log(prev + 1);
    return prev + 1;
  });


  const changeState = async () => {
    if (testRef.current) {
      clearTimeout(testRef.current);
      testRef.current = null;
    }

      // 요 안에서 한 개의 update function 은 하나로 batching 됨.
      trigger();
      trigger();

      // 1.5초 후에는 4개의 update function 을 하나로 batching 시킴.
      setTimeout(() => {
        trigger();
        trigger();
      }, 1500);
      setTimeout(() => {
        trigger();
        trigger();
      }, 1500);

      testRef.current = setTimeout(() => {
        // 1초 후에는 두 개의 update function 을 하나로 batching 시킴
        trigger();
        trigger();
      }, 1000);
      return;
  }

  useLayoutEffect(() => {
    console.log('render');
  })

  return (<div>
    	<button onClick={changeState}>change it</button>
		<p> {test}</p>
	</div>);
}

export default App;

```

- changeState 함수는 onClick 이벤트 핸들러를 통해 호출되며, 버튼 클릭 시 두 차례에 걸쳐 리렌더링이 발생한다.
- 이유는 이벤트 핸들러 내에 위치한 state update 작업은 하나의 queue 에 묶여 batching 처리되고, 이후 timeout 이 끝난 후에 실행되는 두 개의 state update 작업은 따로 queue에 묶여 리렌더링을 유발시키기 때문이다.
- 중요한 것은 위 작업이 하나의 queue 에 batching 되지 않는다는 점이다. 이벤트 핸들러에서 실행된 setState 와 setTimeout 을 기반으로 실행된 setState 는 서로 batching 되지 않고 독립적으로 실행된다.
- 한 가지 신기한 점은 이벤트 핸들러에서 실행되었고 딜레이가 같은 두 개의 setTimeout 내 update function 도 하나로 batching 되었다는 점이다.

### ReactDOM.flushSync() 란?

- react-dom 라이브러리에 추가된 `ReactDOM.flushSync()` 메서드는 **Auto Batching 을 무시하고** 즉시 DOM을 렌더링해준다.
- React 에서는 공식적으로 해당 메서드의 사용을 추천하진 않으며 (de-opt case), 필요한 상황이 있을 경우에만 사용할 것을 강조했다.

```jsx
import { flushSync } from "react-dom";

function handleClick() {
	// React 는 flushSync 메서드가 실행되는 즉시 DOM을 업데이트 한다.
	flushSync(() => {
		setCounter((c) => c + 1);
	});
	// React 는 flushSync 메서드가 실행되는 즉시 DOM을 업데이트 한다.
	flushSync(() => {
		setFlag((f) => !f);
	});
	// 따라서 해당 함수가 실행될 경우 React는 총 두 번의 리렌더링을 수행한다.
}
```

## References

- https://beta.reactjs.org/blog/2022/03/08/react-18-upgrade-guide#automatic-batching
- https://github.com/reactwg/react-18/discussions/21
