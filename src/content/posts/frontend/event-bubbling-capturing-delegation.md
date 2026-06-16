

> 이벤트는 특정한 요소에만 정확히 발동되는 줄 알았던 과거의 나를 생각하며..

이벤트 버블링, 이벤트 캡쳐링. 무슨 이벤트 하나에 이렇게 많은 단어들이 들어가는지 처음 JS에 입문하던 나로서는 이해할 수 없었다. 하지만 Vanilla JS로 직접 같은 카드 찾기 미니 게임을 구현했을 때 `addEventListener` 에서 얼마나 많은 고통을 받았었는가. 이번 포스팅은 그때의 나를 회상하며 다시금 이벤트에 대한 내용을 정리하였다. **과거의 나야, 왜 그때 이벤트 위임을 공부하지 않은 거니..** 

## Event flow

### 3 Step of Event in DOM

![](https://velog.velcdn.com/images/rookieand/post/839a71c6-4fcb-40e4-8fc5-74c6f11baac6/image.png)


- 특정 DOM 요소에 이벤트가 발생할 경우 이벤트는 아래와 같은 순서로 전파된다.

  1. **Capture Phase** : 상위 요소로부터 하위 요소로 이벤트가 전파되는 과정
  2. **Target Phase** : 이벤트를 발생시킨 요소에 이벤트를 전달하는 과정
  3. **Bubbling Phase** : 하위 요소로부터 상위 요소로 이벤트가 다시 전파되는 과정

- 이는 이벤트가 상위 요소로부터 하위 요소로 이벤트가 전파되며, 이벤트가 발생된 요소에 이를 전달한 후 다시 상위 요소로 이벤트가 다시 전달됨을 의미한다.
- 이를 JS 에서는 **Event Flow** 라고 하며, 사용자는 이벤트 핸들러를 Capture Phase 혹은 Bubbling Phase에서 실행하도록 설정할 수 있다. 단 하나의 핸들러에 두 Phase 모두 실행되도록 할 수는 없다.
- Event Flow 는 DOM 에서 **이벤트의 흐름을 제어하는데** 아주 중요한 역할을 하며, 이벤트가 무작위로 실행되지 않고 일정한 흐름을 통해 연관된 요소를 순환하며 이벤트를 전파하도록 해준다.

### addEventListener(type, handler, option)

- `EventTarget.addEventListener()` 는 특정 DOM 요소에 부착하여 이벤트가 발생되었을 경우 이를 인식하여 인자로 넘긴 콜백 함수를 실행시키도록 하는 Web API 다.
- 인자로는 총 3개를 받으며, 마지막 optional 인자인 `useCapture` boolean 값을 통해 캡쳐링 단계에서 리스너를 부착시킬지, 아니면 버블링 단계에서 리스너를 부착시킬지를 정한다. 기본 값은 `false` 다.

```js
const contentNode = document.getElementById("content");

contentNode.addEventListener(
	"click",
	function (event) {
		console.log(event.target, this);
	},
	true // useCapture : true (캡처링 단계에서 이벤트 수신)
);

contentNode.addEventListener("click", function (event) {
	console.log(event.target, event.currentTarget);
	// useCapture : false (버블링 단계에서 이벤트 수신)
});
```

### .target 과 .currentTarget의 차이

- `event` 객체의 `target` 속성은 이벤트가 발생된 가장 안쪽의 요소, 즉 Target Phase의 대상이 되는 요소를 접근할 수 있도록 해준다.
- 하지만 `currentTarget` 의 경우 현재 실행 중인 핸들러가 할당된 요소를 의미한다. 즉, 지금 이벤트가 실행 중인 요소를 가리킨다.
- 이벤트 핸들러 내부의 `this` 또한 이벤트가 실행 중인 요소, 즉 `event.currentTarget` 과 같은 요소를 가리킨다.

```html
<div id="content">
	<div id="btn-content">
		<button id="btn">클릭</button>
	</div>
</div>
<script src="/test.js"></script>
```

```js
const contentNode = document.getElementById("content");
const btnContentNode = document.getElementById("btn-content");
const btnNode = document.getElementById("btn");

// 캡처링 단계를 체크하는 이벤트 핸들러
contentNode.addEventListener(
	"click",
	function (event) {
		console.log(event.target, this);
	},
	true
);

btnContentNode.addEventListener(
	"click",
	function (event) {
		console.log(event.target, event.currentTarget);
	},
	true
);

btnNode.addEventListener(
	"click",
	function (event) {
		console.log(event.target, event.currentTarget);
	},
	true
);

// 버블링 단계를 체크하는 이벤트 핸들러
contentNode.addEventListener("click", function (event) {
	console.log(event.target, event.currentTarget);
});

btnContentNode.addEventListener("click", function (event) {
	console.log(event.target, event.currentTarget);
});

btnNode.addEventListener("click", function (event) {
	console.log(event.target, event.currentTarget);
});

// 실행 결과, event.target은 어떤 상황이던 이벤트를 발생시킨 요소를 가리키지만
// event.currentTarget의 경우 현재 발동된 이벤트 핸들러가 부착된 요소를 가리킨다.

// <button id=​"btn">​클릭​</button> <div id=​"content">​…​</div>​
// <button id=​"btn">​클릭​</button>​ <div id=​"btn-content">​…​</div>​
// <button id=​"btn">​클릭​</button>​ <button id=​"btn">​클릭​</button>​
// <button id=​"btn">​클릭​</button>​ <button id=​"btn">​클릭​</button>​
// <button id=​"btn">​클릭​</button>​ <div id=​"btn-content">​…​</div>​
// <button id=​"btn">​클릭​</button>​ <div id=​"content">​…​</div>​
```
![](https://velog.velcdn.com/images/rookieand/post/439bce50-929e-48d1-858a-ce846f2446b1/image.PNG)


> **event.eventPhase** 속성은 뭘까?

- `event.eventPhase` 란 현재 발동 중인 이벤트의 Phase를 정수 값으로 가진 속성이다. 이를 통해 현재 이벤트 흐름의 단계를 알 수 있다.
- `1` 은 Capturing Phase, `2` 는 Target Phase, `3` 은 Bubbling Phase를 각각 의미한다. Event Flow와 값이 동일하다.

## Event Capturing & Bubbling

### Event Capturing

- Event Capturing 이란, **조상 요소로부터 이벤트가 발동된 하위 요소** 로 이벤트가 순차적으로 전파되는 과정을 의미한다. 또한 Event Flow 에서 **첫 번째로 동작**하기에 Bubbling Phase 보다 우선적으로 실행된다.
- 하지만 Event Capturing 의 경우 사용 빈도가 극히 드물고, Event Bubbling 으로도 이벤트 흐름을 충분히 처리할 수 있기에 최신 브라우저에서는 점차 지원을 안하는 추세라고 한다.

### Event Bubbling

- Event Bubbling 이란, **이벤트가 발동된 하위 요소로부터 조상 요소로** 다시 이벤트가 전파되는 과정을 의미한다. Event Flow 에서는 **가장 마지막으로 동작** 하기에 Capturing Phase 보다 나중에 실행된다.
- `focus` 같은 일부 이벤트는 Bubbling 되지 않는다. 하지만 거의 대부분의 이벤트는 Capturing과 Bubbling 이 된다고 보면 된다.

```html
// index.html
<div id="first">
	<div id="second">
		<button id="third">클릭</button>
	</div>
</div>
```

```js
// test.js
const firstNode = document.getElementById("first");
const secondNode = document.getElementById("second");
const thirdNode = document.getElementById("third");

firstNode.addEventListener(
	"click",
	function (event) {
		console.log("id가 `three`인 button 태그의 Click EventListener");
		event.stopPropagation();
	},
	true
);

secondNode.addEventListener(
	"click",
	function (event) {
		console.log("id가 `two`인 div 태그의 Click EventListener");
	},
	true
);

thirdNode.addEventListener(
	"click",
	function (event) {
		console.log("id가 `three`인 button 태그의 Click EventListener");
	},
	true
);

firstNode.addEventListener("click", function (event) {
	console.log("id가 `first`인 div 태그의 Click EventListener");
});

secondNode.addEventListener("click", function (event) {
	console.log("id가 `two`인 div 태그의 Click EventListener");
});

thirdNode.addEventListener("click", function (event) {
	console.log("id가 `three`인 button 태그의 Click EventListener");
});

// 실행 결과 : 먼저 Capturing Phase에서 이벤트를 수신한 Listener가 실행
// 이후 Bubbling Phase에서 이벤트를 수신한 Listener 가 순차적으로 실행된다.

// id가 `three`인 button 태그의 Click EventListener
// id가 `two`인 div 태그의 Click EventListener
// id가 `three`인 button 태그의 Click EventListener
// id가 `three`인 button 태그의 Click EventListener
// id가 `two`인 div 태그의 Click EventListener
// id가 `first`인 div 태그의 Click EventListener
```
![](https://velog.velcdn.com/images/rookieand/post/6778b245-c0d5-4520-b41f-a47ad5ad7fdb/image.PNG)


### event.stopPropagation()

- `event.stopPropagation()` 은 해당 이벤트가 다른 요소로 전파되는 것을 막는다. 따라서 Capturing 에서는 하위 요소로 이벤트가 전파됨을 막고, Bubbling 에서는 상위 요소로 이벤트가 전파됨을 막는다.
- 만약 Capturing Phase 에서 이벤트 전파가 막혔다면, 이후 Phase 에 대한 작업도 자동으로 중단된다. 따라서 Bubbling Phase 에 등록한 이벤트 리스너 또한 실행되지 않는다.

```html
<div id="first">
	<div id="second">
		<button id="third">클릭</button>
	</div>
</div>
```

```js
const firstNode = document.getElementById("first");

firstNode.addEventListener(
	"click",
	function (event) {
		console.log("id가 `three`인 button 태그의 Click EventListener");
		event.stopPropagation();
	},
	true
);

firstNode.addEventListener("click", function (event) {
	console.log("id가 `first`인 div 태그의 Click EventListener");
});

// 실행 결과 : Capturing Phase에 부착된 이벤트 리스너는 정상적으로 동작한다.
// 하지만 event.stopPropagation() 으로 인해 더 이상 이벤트가 전파되지 않는다.

// id가 `three`인 button 태그의 Click EventListener
```
![](https://velog.velcdn.com/images/rookieand/post/585805d6-c93e-4a31-8b19-155d6ac63cab/image.PNG)

## Event Delegation

### Event Delegation (이벤트 위임) 이란?

- Event Delegation 이란, 하위 요소에 개별적인 이벤트 리스너를 부착하지 않고 상위 요소에서 하위 요소의 이벤트를 **일괄적으로 제어하는 방식**을 의미한다.
- 상위 요소에 이벤트 리스너를 부착시키면, 하위 요소에서 이벤트가 발동되었을 때 **Bubbling Phase** 에서 이를 일괄적으로 감지할 수 있기 때문이다.
- 따라서 새로운 요소가 추가되었을 경우, 개별적으로 이벤트 리스너를 부착시키지 않고 상위 요소에서 이벤트 감지에 대한 로직을 처리하게끔 할 수 있다.

```html
<ul id="item-list">
	<li id="item-1">1</li>
</ul>
<script src="/test.js"></script>
```

```js
// 이벤트 위임을 하지 않았을 경우, 새로운 요소가 추가될 때마다 리스너 부착
const itemListNode = document.getElementById("item-list");
const firstNode = document.getElementById("item-1");

// 해당 리스너는 newNode 가 생성되기 전에 이미 firstNode 에 부착되었다.
firstNode.addEventListener("click", function () {
	alert("clicked");
});

const newNode = document.createElement("li");
newNode.classList.add("item-2");
newNode.innerText = "2";
itemListNode.appendChild(newNode);

// 따라서 새로운 요소인 newNode를 생성한 후에 별도의 이벤트 리스너를 부착해야 한다.
newNode.addEventListener("click", function () {
	alert("clicked");
});
```

- 기존의 `<li>` 태그에는 정상적으로 이벤트 핸들러가 잘 부착되었으나, 만약 새로운 `<li>` 태그를 추가한다면 해당 태그에도 이벤트 리스너를 추가적으로 부착해야 한다.
- 하지만 이렇게 될 경우 추가된 DOM 요소가 많아질수록 이벤트 리스너를 개별적으로 달아주어야 하며, 이는 코드의 복잡도를 증가시킬 뿐만 아니라 무척 번거로운 작업이 될 것이다.
- 따라서 **상위 요소** 인 `<ul>` 태그에 이벤트 리스너를 달아 하위 요소에서 발생된 이벤트를 Bubbling Phase 에서 감지하도록 일괄적으로 위임하는 것이다.

```js
const itemListNode = document.getElementById("item-list");
const firstNode = document.getElementById("item-1");

// 해당 리스너는 하위 요소의 이벤트를 Bubbling Phase에서 감지하기에 효율적이다.
itemListNode.addEventListener("click", function () {
	alert("clicked");
});

const newNode = document.createElement("li");
newNode.classList.add("item-2");
newNode.innerText = "2";
itemListNode.appendChild(newNode);
```

### event.target.closest()

- `event.target.closest()` 메서드는 이벤트가 발동된 요소의 상위 요소들 중에서 인자로 받은 `selector` 와 가장 근접한 조상 요소를 반환한다.
- 이를 활용하여 해당 이벤트가 특정 태그 내부에서 일어났는지를 명확히 알 수 있다. Bubbling Phase의 대상이 된 요소들 중에서 사용자가 원하는 특정 요소에 대한 실행을 제어할 수 있다.

```html
<table id="table">
	<tr>
		<th colspan="3">
			<em>Bagua</em> Chart: Direction, Element, Color, Meaning
		</th>
	</tr>
	<tr>
		<td class="nw">
			<strong>Northwest</strong><br />Metal<br />Silver<br />Elders
		</td>
		<td class="n">...</td>
		<td class="ne">...</td>
	</tr>
</table>
<script src="/test.js"></script>
```

```js
const tableNode = document.getElementById("table");
tableNode.addEventListener("click", function (event) {
	let tdNode = event.target.closest("td");
	if (!tdNode) return;
	if (!tableNode.contains(tdNode)) return;
	alert("only td node is clicked!");
});
```

- 상단의 코드는 이벤트가 발동된 요소의 상위 요소들 중 `<td>` 태그가 있다면 이를 반환하고, 그렇지 않으면 `null` 을 반환한다.
- `event.target` 이 `<td>` 태그 내에 있지 않을 경우, 그리고 현재 id가 table 인 `<table>` 태그 내에 해당 태그가 위치하지 않을 경우 핸들러를 종료한다.
- `event.target.closest()` 메서드는 이벤트가 발동된 대상 주변에 특정 요소가 존재하는지를 체크할 수 있기에 효율적이다.

## References

- https://joshua1988.github.io/web-development/javascript/event-propagation-delegation/
- https://ko.javascript.info/event-delegation
- https://www.javatpoint.com/event-bubbling-and-capturing-in-javascript
